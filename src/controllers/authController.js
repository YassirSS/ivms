import crypto from "crypto";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import Department from "../models/Department.js";
import emailService from "../services/emailService.js";
import { DEPARTMENTS } from "../constants/enums.js";
import { PERMISSIONS, computeUserPermissions } from "../acl/index.js";
import { buildAllowedProfileUpdates } from "../policies/profileUpdate/index.js";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (permission-gated by route)
export const register = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  const {
    name,
    email,
    password,
    department,
    role,
    jobTitle, // bundle identity
    permissions = [],
    userType, // new
    isSeasonal = false, // new
    driverProfile,
    employeeProfile,
    contractorProfile,
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      });
    }

    // Check if department exists
    const departmentDoc = await Department.findOne({
      name: req.body.department,
    });
    if (!departmentDoc) {
      return res.status(400).json({
        success: false,
        error: "Invalid department",
      });
    }

    // Elevation guard: centrally enforce who can create elevated roles
    const desiredRole = role || "user";
    const isSuperAdmin = req.user?.role === "super_admin";

    const callerPerms =
      typeof req.user?.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user?.permissions)
        ? req.user.permissions
        : [];

    const callerPermsSet = new Set(callerPerms);

    if (!isSuperAdmin) {
      if (
        desiredRole === "manager" &&
        !callerPermsSet.has(PERMISSIONS.USER_ELEVATE_MANAGER)
      ) {
        return res.status(403).json({
          success: false,
          error: "Not allowed to create manager accounts",
        });
      }
      if (
        desiredRole === "admin" &&
        !callerPermsSet.has(PERMISSIONS.USER_ELEVATE_ADMIN)
      ) {
        return res.status(403).json({
          success: false,
          error: "Not allowed to create admin accounts",
        });
      }
    }

    // Validate and sanitize custom overrides against known PERMISSIONS
    let userPermissions = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      const known = new Set(Object.values(PERMISSIONS));
      const invalid = permissions.filter((p) => !known.has(p));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid permission values",
          details: invalid,
        });
      }

      // Allow assigning overrides only if caller has approval permission
      const canAssign =
        isSuperAdmin || callerPerms.includes(PERMISSIONS.OVERRIDE_APPROVE);
      if (canAssign) {
        userPermissions = Array.from(new Set(permissions));
      }
    }

    // Prepare role-specific profile subdoc based on userType
    const safeDriver = driverProfile
      ? {
          // pick allowed keys only
          licenseNumber: driverProfile.licenseNumber,
          licenseExpiry: driverProfile.licenseExpiry,
          iqamaNumber: driverProfile.iqamaNumber,
          emergencyContact: driverProfile.emergencyContact,
          badgeId: driverProfile.badgeId,
        }
      : undefined;

    const safeEmployee = employeeProfile
      ? {
          employeeId: employeeProfile.employeeId,
          title: employeeProfile.title,
          managerId: employeeProfile.managerId,
          emergencyContact: employeeProfile.emergencyContact,
        }
      : undefined;

    const safeContractor = contractorProfile
      ? {
          companyName: contractorProfile.companyName,
          contractId: contractorProfile.contractId,
          contractStart: contractorProfile.contractStart,
          contractEnd: contractorProfile.contractEnd,
          contactPhone: contractorProfile.contactPhone,
        }
      : undefined;

    const profileFields = {
      driver: {
        driverProfile: safeDriver,
        employeeProfile: undefined,
        contractorProfile: undefined,
      },
      employee: {
        driverProfile: undefined,
        employeeProfile: safeEmployee,
        contractorProfile: undefined,
      },
      contractor: {
        driverProfile: undefined,
        employeeProfile: undefined,
        contractorProfile: safeContractor,
      },
    };

    const selectedProfiles = profileFields[userType] || {
      driverProfile: undefined,
      employeeProfile: undefined,
      contractorProfile: undefined,
    };

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: desiredRole,
      department: departmentDoc.name,
      jobTitle: jobTitle || null,
      permissions: userPermissions,
      userType,
      isSeasonal: Boolean(isSeasonal),
      ...selectedProfiles,
      createdBy: req.user?._id || undefined,
    });

    // Generate email verification token & send email
    const emailVerificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.name,
        emailVerificationToken
      );
    } catch (error) {
      console.error("Error sending verification email:", error);
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res
      .status(201)
      .cookie("token", token)
      .json({
        success: true,
        message:
          desiredRole === "manager"
            ? "Manager registered successfully"
            : "Employee registered successfully",
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            jobTitle: user.jobTitle,
            userType: user.userType,
            isSeasonal: user.isSeasonal,
            permissions: user.getEffectivePermissions(),
            isActive: user.isActive,
            isEmailVerified: user.emailVerified,
            driverProfile: user.driverProfile,
            employeeProfile: user.employeeProfile,
            contractorProfile: user.contractorProfile,
          },
          token,
        },
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// export const login = async (req, res, next) => {
//   // Check for validation errors
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       error: "Validation failed",
//       details: errors.array(),
//     });
//   }

//   const { email, password } = req.body;

//   try {
//     // Check for user
//     const user = await User.findOne({ email }).select("+password");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//     }

//     // Check if password matches
//     const isMatch = await user.matchPassword(password);

//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       return res.status(401).json({
//         success: false,
//         error: "Account is deactivated. Please contact administrator.",
//       });
//     }

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save({ validateBeforeSave: false });

//     // Generate JWT token
//     const token = user.getSignedJwtToken();

//     // Set cookie options
//     // const options = {
//     //   expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
//     //   httpOnly: true,
//     //   secure: process.env.NODE_ENV === 'production',
//     //   sameSite: 'strict'
//     // };

//     res
//       .status(200)
//       .cookie("token", token)
//       .json({
//         success: true,
//         data: {
//           user: {
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             department: user.department,
//             lastLogin: user.lastLogin,
//           },
//           token,
//         },
//       });
//   } catch (error) {
//     next(error);
//   }
// };

export const login = async (req, res, next) => {
  console.log("🟢 LOGIN attempt received:", req.body);

  // 1️⃣ Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Validation failed:", errors.array());
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  const { email, password } = req.body;
  console.log("📧 Email entered:", email);

  try {
    // 2️⃣ Find user and include password
    const user = await User.findOne({ email }).select("+password");
    console.log("👤 User found:", !!user);

    if (!user) {
      console.log("⚠️ No user found with that email");
      return res.status(401).json({
        success: false,
        error: "Invalid credentials (no user)",
      });
    }

    // 3️⃣ Verify password
    console.log("🔑 Checking password match...");
    const isMatch = await user.matchPassword(password);
    console.log("🧩 Password match result:", isMatch);

    if (!isMatch) {
      console.log("❌ Password did not match for user:", email);
      return res.status(401).json({
        success: false,
        error: "Invalid credentials (wrong password)",
      });
    }

    // 4️⃣ Check activation
    console.log("🟡 User active status:", user.isActive);
    if (!user.isActive) {
      console.log("🚫 Account deactivated for:", email);
      return res.status(401).json({
        success: false,
        error: "Account is deactivated. Please contact administrator.",
      });
    }

    // 5️⃣ Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    console.log("📅 Updated lastLogin:", user.lastLogin);

    // 6️⃣ Create token
    const token = user.getSignedJwtToken();
    console.log("🔐 Token generated (first 20 chars):", token.slice(0, 20));

    // 7️⃣ Respond success
    res
      .status(200)
      .cookie("token", token)
      .json({
        success: true,
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            jobTitle: user.jobTitle, // expose jobTitle
            permissions: user.getEffectivePermissions(),
            lastLogin: user.lastLogin,
          },
          token,
        },
      });

    console.log("✅ LOGIN successful for:", email);
  } catch (error) {
    console.error("💥 LOGIN error:", error);
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          permissions: user.getEffectivePermissions(),
          isActive: user.isActive,
          isEmailVerified: user.emailVerified, // use schema field
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          jobTitle: user.jobTitle, // include bundle identity
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Normalize perms to a Set for O(1) checks
    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // Build allowed patch via policy engine (now passes Set)
    const allowed = buildAllowedProfileUpdates({
      payload: req.body || {},
      perms: permSet,
      PERMISSIONS,
    });

    if (!allowed || Object.keys(allowed).length === 0) {
      return res.status(403).json({
        success: false,
        error:
          "Not allowed to update requested fields. Submit a profile change request.",
      });
    }

    // Helper to merge nested subdocs
    const mergeSubdoc = (target, key, patch) => {
      if (!patch) return;
      target[key] = { ...(target[key] || {}), ...patch };
    };

    // Email change: uniqueness + reset verification, and set explicitly
    if (allowed.email) {
      const existingUser = await User.findOne({
        email: allowed.email,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, error: "Email is already taken" });
      }
      user.email = allowed.email;
      user.emailVerified = false; // standardize field name
      delete allowed.email; // prevent double-setting in the loop
    }

    // Apply updates, including nested subdocs
    mergeSubdoc(user, "driverProfile", allowed.driverProfile);
    mergeSubdoc(user, "employeeProfile", allowed.employeeProfile);
    mergeSubdoc(user, "contractorProfile", allowed.contractorProfile);

    // Remove handled subdocs to avoid re-processing
    delete allowed.driverProfile;
    delete allowed.employeeProfile;
    delete allowed.contractorProfile;

    for (const [k, v] of Object.entries(allowed)) {
      user[k] = v;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle,
          userType: user.userType,
          isSeasonal: user.isSeasonal,
          permissions: user.getEffectivePermissions?.() || permsArr,
          driverProfile: user.driverProfile,
          employeeProfile: user.employeeProfile,
          contractorProfile: user.contractorProfile,
          isEmailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Require active account
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    // Permission gate: self password change
    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);
    if (!permSet.has(PERMISSIONS.USER_PASSWORD_CHANGE_SELF)) {
      return res.status(403).json({
        success: false,
        error: "Not allowed to change password",
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Check current password
    const currentOk = await user.matchPassword(currentPassword);
    if (!currentOk) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Prevent reusing the same password
    const isSame = await user.matchPassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        error: "New password must be different from current password",
      });
    }

    // Set new password and update metadata
    user.password = newPassword;
    user.lastPasswordChange = new Date();

    // Clear any reset tokens/codes
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password changed successfully" },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset code
// @route   POST /api/auth/forgot-password-code
// @access  Public
export const forgotPasswordCode = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No user found with this email",
      });
    }

    // Get reset code
    const resetCode = user.getResetPasswordCode();

    await user.save({ validateBeforeSave: false });

    try {
      await emailService.sendPasswordResetCodeEmail(
        user.email,
        resetCode,
        user.name
      );

      res.status(200).json({
        success: true,
        data: { message: "Password reset code sent to your email" },
      });
    } catch (error) {
      console.error("Error sending password reset code email:", error);
      user.resetPasswordCode = undefined;
      user.resetPasswordCodeExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: "Email could not be sent",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with code
// @route   PUT /api/auth/reset-password-code
// @access  Public
export const resetPasswordWithCode = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    const { email, code, password } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordCodeExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code",
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password reset successful" },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No user found with this email",
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );

      res.status(200).json({
        success: true,
        data: { message: "Password reset email sent" },
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: "Email could not be sent",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }

  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password reset successful" },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    // Get hashed token
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification token",
      });
    }

    // Mark email as verified
    user.emailVerified = true; // fix field name per schema
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error("Error sending welcome email:", error);
    }

    res.status(200).json({
      success: true,
      data: { message: "Email verified successfully" },
    });
  } catch (error) {
    next(error);
  }
};
