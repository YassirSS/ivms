import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  forgotPasswordCode,
  resetPasswordWithCode,
  verifyEmail,
} from "../controllers/authController.js";

import { protect, authorizePermissions } from "../middleware/auth.js";
import { DEPARTMENTS, USER_ROLE } from "../constants/enums.js";
import { JOB_TITLE_BUNDLES, PERMISSIONS } from "../acl/index.js";

const router = express.Router();

// Validation middleware
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("department")
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department"),
  body("role")
    .optional()
    .isIn(Object.values(USER_ROLE))
    .withMessage("Invalid role"),
  // Require jobTitle to be one of known bundle keys
  body("jobTitle")
    .isString()
    .trim()
    .isIn(Object.keys(JOB_TITLE_BUNDLES))
    .withMessage("Invalid jobTitle. Must be one of the configured bundles."),
  // permissions must be array of known PERMISSIONS
  body("permissions")
    .optional()
    .isArray()
    .withMessage("permissions must be an array")
    .bail()
    .custom((arr) =>
      Array.isArray(arr)
        ? arr.every((p) => Object.values(PERMISSIONS).includes(p))
        : false
    )
    .withMessage("One or more permissions are invalid"),
  // userType required
  body("userType")
    .isIn(["driver", "employee", "contractor"])
    .withMessage("Invalid userType"),
  // isSeasonal optional boolean
  body("isSeasonal")
    .optional()
    .isBoolean()
    .withMessage("isSeasonal must be boolean"),
  // Embedded profiles (optional; validated by type)
  body("driverProfile.licenseNumber").optional().isString().trim(),
  body("driverProfile.licenseExpiry").optional().isISO8601().toDate(),
  body("driverProfile.iqamaNumber").optional().isString().trim(),
  body("driverProfile.emergencyContact").optional().isString().trim(),
  body("driverProfile.badgeId").optional().isString().trim(),

  body("employeeProfile.employeeId").optional().isString().trim(),
  body("employeeProfile.title").optional().isString().trim(),
  body("employeeProfile.managerId").optional().isMongoId(),
  body("employeeProfile.emergencyContact").optional().isString().trim(),

  body("contractorProfile.companyName").optional().isString().trim(),
  body("contractorProfile.contractId").optional().isString().trim(),
  body("contractorProfile.contractStart").optional().isISO8601().toDate(),
  body("contractorProfile.contractEnd").optional().isISO8601().toDate(),
  body("contractorProfile.contactPhone").optional().isString().trim(),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const resetPasswordWithCodeValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("code")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Code must be a 6-digit number"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  // Allow changing jobTitle (if authorized in controller)
  body("jobTitle")
    .optional()
    .isIn(Object.keys(JOB_TITLE_BUNDLES))
    .withMessage("Invalid jobTitle"),
  // Allow updating custom overrides
  body("permissions")
    .optional()
    .isArray()
    .withMessage("permissions must be an array")
    .bail()
    .custom((arr) =>
      Array.isArray(arr)
        ? arr.every((p) => Object.values(PERMISSIONS).includes(p))
        : false
    )
    .withMessage("One or more permissions are invalid"),
  // Allow changing seasonal flag and some profile fields per permissions in controller
  body("isSeasonal").optional().isBoolean(),
  body("driverProfile.emergencyContact").optional().isString().trim(),
  body("driverProfile.licenseNumber").optional().isString().trim(),
  body("driverProfile.licenseExpiry").optional().isISO8601().toDate(),
  body("driverProfile.iqamaNumber").optional().isString().trim(),

  body("employeeProfile.employeeId").optional().isString().trim(),
  body("employeeProfile.title").optional().isString().trim(),
  body("employeeProfile.managerId").optional().isMongoId(),
  body("employeeProfile.emergencyContact").optional().isString().trim(),

  body("contractorProfile.companyName").optional().isString().trim(),
  body("contractorProfile.contractId").optional().isString().trim(),
  body("contractorProfile.contractStart").optional().isISO8601().toDate(),
  body("contractorProfile.contractEnd").optional().isISO8601().toDate(),
  body("contractorProfile.contactPhone").optional().isString().trim(),
];

// Routes
router.post(
  "/register",
  protect,
  authorizePermissions(PERMISSIONS.USER_CREATE),
  // authorize(/*"super_admin", */ "manager", "admin"),
  registerValidation,
  register
);
// No need to have two separate routes for registration
// router.post(
//   "/register-manager",
//   protect,
//   authorize(/*"super_admin", */ "manager", "admin"),
//   registerValidation,
//   register
// );
router.post("/login", loginValidation, login);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post(
  "/forgot-password-code",
  forgotPasswordValidation,
  forgotPasswordCode
);
router.put(
  "/reset-password/:resettoken",
  resetPasswordValidation,
  resetPassword
);
router.put(
  "/reset-password-code",
  resetPasswordWithCodeValidation,
  resetPasswordWithCode
);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.get("/logout", protect, logout);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfileValidation, updateProfile);
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  changePassword
);

export default router;
