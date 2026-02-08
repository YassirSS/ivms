import { body, param, query } from "express-validator";
import { DEPARTMENTS, USER_ROLE } from "../constants/enums.js";
import { PERMISSIONS, JOB_TITLE_BUNDLES } from "../config/acl.js";

// Validation for updating user
export const validateUpdateUser = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("department")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department"),

  body("role")
    .optional()
    .isIn(Object.values(USER_ROLE))
    .withMessage("Invalid role"),

  body("jobTitle")
    .optional()
    .isIn(Object.keys(JOB_TITLE_BUNDLES))
    .withMessage("Invalid job title"),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((arr) => {
      const all = new Set(Object.values(PERMISSIONS));
      return arr.every((p) => all.has(p));
    })
    .withMessage("Permissions contain unknown values"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// Validation for updating user role
export const validateUpdateUserRole = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(Object.values(USER_ROLE))
    .withMessage("Role must be either admin, manager, user or driver"),
];

// Validation for user ID parameter
export const validateUserId = [
  param("id").isMongoId().withMessage("Invalid user ID"),
];

// Validation for user query parameters
export const validateUserQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("role")
    .optional()
    .isIn(Object.values(USER_ROLE))
    .withMessage("Invalid role filter"),

  query("department")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department filter"),

  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "email",
      "role",
      "department",
      "isActive",
      "createdAt",
      "updatedAt",
      "lastLogin",
    ])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("includeInactive")
    .optional()
    .isBoolean()
    .withMessage("Include inactive must be a boolean"),
];

// Validation for available drivers query
export const validateDriverQuery = [
  query("department")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department filter"),
];

// Validation for updating user profile (name and email only)
export const validateUpdateUserProfile = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];
