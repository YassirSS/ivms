import { validationResult } from "express-validator";
import User from "../models/User.js";
import Bus from "../models/Bus.js";
import { PERMISSIONS, computeUserPermissions } from "../acl/index.js";
import { buildAllowedProfileUpdates } from "../policies/profileUpdate/index.js";

// @desc    Get all users with filtering, pagination, and search
// @route   GET /api/users
// @access  Private (Manager only)
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      department,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeInactive = false,
    } = req.query;

    // Build query
    const query = {};

    // Role filter
    if (role) {
      query.role = role;
    }

    // Department filter
    if (department) {
      query.department = department;
    }

    // Active status filter
    if (!includeInactive) {
      query.isActive = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Permission-driven department scope
    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // If caller lacks USER_LIST permission for broad access, restrict to own department
    if (!permSet.has(PERMISSIONS.USER_LIST) && !department) {
      query.department = req.user.department;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken"
      )
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching users",
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Manager, Admin, or own profile)
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken"
      )
      .populate("createdBy", "name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isOwnProfile = req.user._id.toString() === user._id.toString();

    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // Permission-driven access: allow if self or has USER_VIEW permission
    if (!isOwnProfile && !permSet.has(PERMISSIONS.USER_VIEW)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this user",
      });
    }

    // Additional statistics for viewers with USER_VIEW permission
    let additionalData = {};
    if (permSet.has(PERMISSIONS.USER_VIEW)) {
      // Assigned buses count only relevant for driver-type users
      if (user.userType === "driver") {
        const assignedBusesCount = await Bus.countDocuments({
          driver: user._id,
          isActive: true,
        });
        additionalData.assignedBusesCount = assignedBusesCount;
      }

      // Created users count (for users who have created subordinates)
      const createdUsersCount = await User.countDocuments({
        createdBy: user._id,
      });
      if (createdUsersCount > 0) {
        additionalData.createdUsersCount = createdUsersCount;
      }
    }

    res.status(200).json({
      success: true,
      data: { ...user.toObject(), ...additionalData },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching user",
    });
  }
};

// @desc    Update user profile (name and email only)
// @route   PUT /api/users/:id/profile
// @access  Private (Manager or own profile)
export const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Permission gate is handled by route, but compute allowed patch via policy engine using caller perms
    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    const allowed = buildAllowedProfileUpdates({
      payload: req.body || {},
      perms: permSet,
      PERMISSIONS,
    });

    if (!allowed || Object.keys(allowed).length === 0) {
      return res.status(403).json({
        success: false,
        error: "Not allowed to update requested fields",
      });
    }

    // Email change: uniqueness + reset verification
    if (allowed.email) {
      const existingUser = await User.findOne({
        email: allowed.email,
        _id: { $ne: targetUser._id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email is already taken",
        });
      }
      targetUser.email = allowed.email;
      targetUser.emailVerified = false;
      delete allowed.email;
    }

    // Helper to merge nested subdocs
    const mergeSubdoc = (target, key, patch) => {
      if (!patch) return;
      target[key] = { ...(target[key] || {}), ...patch };
    };

    // Apply nested profile patches
    mergeSubdoc(targetUser, "driverProfile", allowed.driverProfile);
    mergeSubdoc(targetUser, "employeeProfile", allowed.employeeProfile);
    mergeSubdoc(targetUser, "contractorProfile", allowed.contractorProfile);

    delete allowed.driverProfile;
    delete allowed.employeeProfile;
    delete allowed.contractorProfile;

    // Apply remaining scalar/root fields
    for (const [k, v] of Object.entries(allowed)) {
      targetUser[k] = v;
    }

    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken"
      )
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Server error while updating user profile",
    });
  }
};

// @desc    Update user (full update including role, department, etc.)
// @route   PUT /api/users/:id
// @access  Private (Manager or own profile)
export const updateUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, department, role, isActive, jobTitle, permissions } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Compute caller permissions (permission-driven gating)
    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // Check permissions
    const isOwnProfile = req.user._id.toString() === user._id.toString();

    // If not self and caller lacks USER_UPDATE, block
    if (!isOwnProfile && !permSet.has(PERMISSIONS.USER_UPDATE)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this user",
      });
    }

    // Field update restrictions for self: require USER_UPDATE for advanced fields
    if (isOwnProfile && !permSet.has(PERMISSIONS.USER_UPDATE)) {
      if (
        department !== undefined ||
        role !== undefined ||
        isActive !== undefined ||
        jobTitle !== undefined ||
        permissions !== undefined
      ) {
        return res.status(403).json({
          success: false,
          error: "You can only update your basic profile fields",
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User already exists with this email",
        });
      }
    }

    // Update basic fields (name and email) - allowed for all authorized users
    if (name) user.name = name;
    if (email) user.email = email;

    // Advanced updates require USER_UPDATE and not self-only restriction
    if (permSet.has(PERMISSIONS.USER_UPDATE) && !isOwnProfile) {
      // Department updates
      if (department) {
        user.department = department;
      }

      // Role updates
      if (role !== undefined) {
        user.role = role;
      }

      // Active status updates
      if (isActive !== undefined) user.isActive = isActive;

      // Job title (bundle) updates
      if (jobTitle !== undefined) {
        user.jobTitle = jobTitle; // enum validation enforced by schema/middleware
      }

      // Custom overrides updates; only if actor has override approval
      if (permissions !== undefined) {
        const canAssign =
          req.user?.hasPermission?.(PERMISSIONS.OVERRIDE_APPROVE) ||
          permSet.has(PERMISSIONS.OVERRIDE_APPROVE);
        if (!canAssign) {
          return res.status(403).json({
            success: false,
            error: "Not authorized to modify custom permissions",
          });
        }
        if (Array.isArray(permissions)) {
          user.permissions = Array.from(new Set(permissions));
        } else {
          return res.status(400).json({
            success: false,
            error: "Permissions must be an array",
          });
        }
      }
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken"
      )
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Server error while updating user",
    });
  }
};

// @desc    Deactivate user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Manager only)
export const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Prevent deactivation of elevated users unless caller has explicit permission
    const targetPerms = computeUserPermissions(user);
    const callerPermsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const callerPerms = new Set(callerPermsArr);

    const targetIsElevated = targetPerms.includes(
      PERMISSIONS.USER_ELEVATE_ADMIN
    );
    const canDeactivateElevated = callerPerms.has(
      PERMISSIONS.USER_DEACTIVATE_ADMIN
    );

    if (targetIsElevated && !canDeactivateElevated) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to deactivate elevated/admin users",
      });
    }

    // Prevent self-deactivation
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Cannot deactivate your own account",
      });
    }

    // Check if user is assigned to any active buses
    const assignedBuses = await Bus.find({ driver: user._id, isActive: true });
    if (assignedBuses.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot deactivate user who is assigned to active buses. Please reassign buses first.",
        assignedBuses: assignedBuses.map((bus) => ({
          _id: bus._id,
          plateNumber: bus.plateNumber,
          description: bus.description,
        })),
      });
    }

    // Deactivate user
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deactivating user",
    });
  }
};

// @desc    Reactivate user
// @route   PUT /api/users/:id/reactivate
// @access  Private (Manager only)
export const reactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        error: "User is already active",
      });
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User reactivated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error reactivating user:", error);
    res.status(500).json({
      success: false,
      error: "Server error while reactivating user",
    });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Manager only)
export const updateUserRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // Require permission to update roles
    if (!permSet.has(PERMISSIONS.USER_ROLE_UPDATE)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update user role",
      });
    }

    // Prevent self role change
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Cannot change your own role",
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating user role",
    });
  }
};

// @desc    Get available drivers (users not assigned to buses)
// @route   GET /api/users/drivers/available
// @access  Private (Manager and User)
export const getAvailableDrivers = async (req, res) => {
  try {
    const { department } = req.query;

    const permsArr =
      typeof req.user.getEffectivePermissions === "function"
        ? req.user.getEffectivePermissions()
        : Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];
    const permSet = new Set(permsArr);

    // Build query for users with role 'user' or 'driver' (drivers)
    const query = {
      role: { $in: ["user", "driver"] },
      isActive: true,
    };

    // Department filter: if caller lacks DRIVER_VIEW permission for broad access, restrict to own department
    if (department) {
      query.department = department;
    } else if (!permSet.has(PERMISSIONS.DRIVER_VIEW)) {
      query.department = req.user.department;
    }

    const allDrivers = await User.find(query)
      .select("name email department role")
      .sort({ name: 1 });

    const assignedBuses = await Bus.find({
      driver: { $ne: null },
      isActive: true,
    }).select("driver");

    const assignedDriverIds = assignedBuses
      .filter((bus) => bus.driver)
      .map((bus) => bus.driver.toString());

    const availableDrivers = allDrivers.filter(
      (driver) => !assignedDriverIds.includes(driver._id.toString())
    );

    res.status(200).json({
      success: true,
      count: availableDrivers.length,
      data: availableDrivers,
    });
  } catch (error) {
    console.error("Error fetching available drivers:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching available drivers",
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Manager only)
export const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactiveUsers: { $sum: { $cond: ["$isActive", 0, 1] } },
          managers: { $sum: { $cond: [{ $eq: ["$role", "manager"] }, 1, 0] } },
          employees: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } },
          busManagementUsers: {
            $sum: { $cond: [{ $eq: ["$department", "bus_management"] }, 1, 0] },
          },
          busTransportUsers: {
            $sum: { $cond: [{ $eq: ["$department", "bus_transport"] }, 1, 0] },
          },
        },
      },
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get assigned drivers count
    const assignedDriversCount = await Bus.countDocuments({
      driver: { $exists: true, $ne: null },
      isActive: true,
    });

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      managers: 0,
      employees: 0,
      busManagementUsers: 0,
      busTransportUsers: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        ...result,
        recentRegistrations,
        assignedDrivers: assignedDriversCount,
        availableDrivers: result.employees - assignedDriversCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching user statistics",
    });
  }
};
