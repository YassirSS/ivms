import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  updateUserProfile,
  deactivateUser,
  reactivateUser,
  updateUserRole,
  getAvailableDrivers,
  getUserStats,
} from "../controllers/userController.js";
import {
  validateUpdateUser,
  validateUpdateUserProfile,
  validateUpdateUserRole,
  validateUserId,
  validateUserQuery,
  validateDriverQuery,
} from "../middleware/userValidation.js";
import { protect, authorizePermissions } from "../middleware/auth.js";
import { PERMISSIONS } from "../acl/index.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (permission-driven)
router.get(
  "/stats",
  authorizePermissions(PERMISSIONS.USER_STATS_VIEW),
  getUserStats
);

// @route   GET /api/users/drivers/available
// @desc    Get available drivers (users not assigned to buses)
// @access  Private (permission-driven)
router.get(
  "/drivers/available",
  authorizePermissions(PERMISSIONS.DRIVER_LIST),
  validateDriverQuery,
  getAvailableDrivers
);

// @route   GET /api/users
// @desc    Get all users with filtering, pagination, and search
// @access  Private (permission-driven)
router.get(
  "/",
  authorizePermissions(PERMISSIONS.USER_LIST),
  validateUserQuery,
  getUsers
);

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Private (permission-driven)
router.get(
  "/:id",
  authorizePermissions(PERMISSIONS.USER_VIEW),
  validateUserId,
  getUser
);

// @route   PUT /api/users/:id/profile
// @desc    Update user profile (name and email only)
// @access  Private (permission-driven)
router.put(
  "/:id/profile",
  authorizePermissions(PERMISSIONS.USER_UPDATE_PROFILE),
  validateUpdateUserProfile,
  updateUserProfile
);

// @route   PUT /api/users/:id
// @desc    Update user (full update including role, department, etc.)
// @access  Private (permission-driven)
router.put(
  "/:id",
  authorizePermissions(PERMISSIONS.USER_UPDATE_ANY),
  validateUpdateUser,
  updateUser
);

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (permission-driven)
router.put(
  "/:id/role",
  authorizePermissions(PERMISSIONS.USER_ROLE_UPDATE),
  validateUpdateUserRole,
  updateUserRole
);

// @route   PUT /api/users/:id/reactivate
// @desc    Reactivate user
// @access  Private (permission-driven)
router.put(
  "/:id/reactivate",
  authorizePermissions(PERMISSIONS.USER_REACTIVATE),
  validateUserId,
  reactivateUser
);

// @route   DELETE /api/users/:id
// @desc    Deactivate user (soft delete)
// @access  Private (permission-driven)
router.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.USER_DEACTIVATE),
  validateUserId,
  deactivateUser
);

export default router;
