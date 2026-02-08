import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { PERMISSIONS } from "../config/acl.js";

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists and is not empty
  if (!token || token.trim() === "") {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No user found with this token",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);

    // Provide more specific error messages based on error type
    let message = "Not authorized to access this route";
    if (error.name === "JsonWebTokenError") {
      message = "Invalid token format";
    } else if (error.name === "TokenExpiredError") {
      message = "Token has expired";
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

export const authorizePermissions = (...perms) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Super admin bypass only
    if (user.role === "super_admin") {
      return next();
    }

    const effective =
      typeof user.getEffectivePermissions === "function"
        ? user.getEffectivePermissions()
        : Array.isArray(user.permissions)
        ? user.permissions
        : [];

    const effectiveSet = new Set(effective);
    const allowed = perms.every((perm) => effectiveSet.has(perm));

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${perms.join(", ")}`,
      });
    }
    next();
  };
};

// Grant access to specific departments
export const authorizeDepartment = (...departments) => {
  return (req, res, next) => {
    if (!departments.includes(req.user.department)) {
      return res.status(403).json({
        success: false,
        message: `User department ${req.user.department} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user is manager or accessing their own data
export const checkOwnership = (req, res, next) => {
  // Managers can access all data in their department
  if (req.user.role === "manager") {
    return next();
  }

  // Users can only access their own data
  const userId = req.params.id || req.params.userId || req.body.userId;

  if (userId && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this resource",
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select("-password");

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we continue without user
      console.log("Optional auth failed:", error.message);
    }
  }

  next();
};
