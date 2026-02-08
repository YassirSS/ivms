import express from "express";
import { body, param, query } from "express-validator";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
  addUserToDepartment,
  removeUserFromDepartment,
  addAssetToDepartment,
  updateDepartmentAsset,
  removeAssetFromDepartment,
  addGoalToDepartment,
  updateDepartmentGoal,
  updateDepartmentBudget,
} from "../controllers/departmentController.js";
import { protect, authorizePermissions } from "../middleware/auth.js";
import { DEPARTMENTS } from "../constants/enums.js";
import { PERMISSIONS } from "../acl/index.js";

const router = express.Router();

// Validation middleware
const validateDepartmentId = [
  param("id").isMongoId().withMessage("Invalid department ID"),
];

const validateCreateDepartment = [
  body("name")
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Name must be either bus_management or bus_transport"),
  body("code")
    .isLength({ min: 2, max: 10 })
    .withMessage("Code must be between 2 and 10 characters")
    .isAlphanumeric()
    .withMessage("Code must contain only letters and numbers"),
  body("description")
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  body("budget.allocated")
    .optional()
    .isNumeric()
    .withMessage("Allocated budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Allocated budget cannot be negative"),
  body("budget.spent")
    .optional()
    .isNumeric()
    .withMessage("Spent budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Spent budget cannot be negative"),
  body("location.building")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Building name cannot exceed 50 characters"),
  body("location.floor")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Floor cannot exceed 20 characters"),
  body("location.room")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Room cannot exceed 20 characters"),
  body("location.address")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),
  body("contactInfo.phone")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please provide a valid phone number"),
  body("contactInfo.email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("contactInfo.extension")
    .optional()
    .isLength({ max: 10 })
    .withMessage("Extension cannot exceed 10 characters"),
];

const validateUpdateDepartment = [
  body("name")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Name must be either bus_management or bus_transport"),
  body("code")
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage("Code must be between 2 and 10 characters")
    .isAlphanumeric()
    .withMessage("Code must contain only letters and numbers"),
  body("description")
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  body("budget.allocated")
    .optional()
    .isNumeric()
    .withMessage("Allocated budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Allocated budget cannot be negative"),
  body("budget.spent")
    .optional()
    .isNumeric()
    .withMessage("Spent budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Spent budget cannot be negative"),
  body("location.building")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Building name cannot exceed 50 characters"),
  body("location.floor")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Floor cannot exceed 20 characters"),
  body("location.room")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Room cannot exceed 20 characters"),
  body("location.address")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),
  body("contactInfo.phone")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please provide a valid phone number"),
  body("contactInfo.email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("contactInfo.extension")
    .optional()
    .isLength({ max: 10 })
    .withMessage("Extension cannot exceed 10 characters"),
  body("performance.efficiency")
    .optional()
    .isNumeric()
    .withMessage("Efficiency must be a number")
    .custom((value) => value >= 0 && value <= 100)
    .withMessage("Efficiency must be between 0 and 100"),
  body("performance.satisfaction")
    .optional()
    .isNumeric()
    .withMessage("Satisfaction must be a number")
    .custom((value) => value >= 0 && value <= 5)
    .withMessage("Satisfaction must be between 0 and 5"),
];

const validateAddUser = [
  body("userId").isMongoId().withMessage("Invalid user ID"),
  body("role")
    .optional()
    .isIn(["manager", "employee"])
    .withMessage("Role must be either manager or employee"),
];

const validateAsset = [
  body("name")
    .isLength({ min: 1, max: 100 })
    .withMessage("Asset name must be between 1 and 100 characters"),
  body("type")
    .isIn(["vehicle", "equipment", "facility", "technology", "other"])
    .withMessage(
      "Asset type must be one of: vehicle, equipment, facility, technology, other"
    ),
  body("value")
    .optional()
    .isNumeric()
    .withMessage("Asset value must be a number")
    .custom((value) => value >= 0)
    .withMessage("Asset value cannot be negative"),
  body("condition")
    .optional()
    .isIn(["excellent", "good", "fair", "poor", "needs_replacement"])
    .withMessage(
      "Condition must be one of: excellent, good, fair, poor, needs_replacement"
    ),
];

const validateGoal = [
  body("title")
    .isLength({ min: 1, max: 100 })
    .withMessage("Goal title must be between 1 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Goal description cannot exceed 300 characters"),
  body("target").optional().isNumeric().withMessage("Target must be a number"),
  body("current")
    .optional()
    .isNumeric()
    .withMessage("Current value must be a number"),
  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("Deadline must be a valid date"),
  body("status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "overdue"])
    .withMessage(
      "Status must be one of: not_started, in_progress, completed, overdue"
    ),
];

const validateBudget = [
  body("allocated")
    .optional()
    .isNumeric()
    .withMessage("Allocated budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Allocated budget cannot be negative"),
  body("spent")
    .optional()
    .isNumeric()
    .withMessage("Spent budget must be a number")
    .custom((value) => value >= 0)
    .withMessage("Spent budget cannot be negative"),
];

const validateQueryParams = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sortBy")
    .optional()
    .isIn([
      "name",
      "code",
      "createdAt",
      "updatedAt",
      "budget.allocated",
      "performance.efficiency",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// Routes

// GET /api/departments/stats - Get department statistics
router.get(
  "/stats",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_STATS_VIEW),
  getDepartmentStats
);

// GET /api/departments - Get all departments
router.get(
  "/",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_VIEW),
  validateQueryParams,
  getDepartments
);

// GET /api/departments/:id - Get single department
router.get(
  "/:id",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_VIEW),
  validateDepartmentId,
  getDepartment
);

// POST /api/departments - Create new department
router.post(
  "/",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_CREATE),
  validateCreateDepartment,
  createDepartment
);

// PUT /api/departments/:id - Update department
router.put(
  "/:id",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_UPDATE),
  validateDepartmentId,
  validateUpdateDepartment,
  updateDepartment
);

// DELETE /api/departments/:id - Delete department
router.delete(
  "/:id",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_DELETE),
  validateDepartmentId,
  deleteDepartment
);

// User management routes
// POST /api/departments/:id/users - Add user to department
router.post(
  "/:id/users",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_USER_MANAGE),
  validateDepartmentId,
  validateAddUser,
  addUserToDepartment
);

// DELETE /api/departments/:id/users/:userId - Remove user from department
router.delete(
  "/:id/users/:userId",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_USER_MANAGE),
  validateDepartmentId,
  param("userId").isMongoId().withMessage("Invalid user ID"),
  removeUserFromDepartment
);

// Asset management routes
// POST /api/departments/:id/assets - Add asset to department
router.post(
  "/:id/assets",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_ASSET_MANAGE),
  validateDepartmentId,
  validateAsset,
  addAssetToDepartment
);

// PUT /api/departments/:id/assets/:assetId - Update department asset
router.put(
  "/:id/assets/:assetId",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_ASSET_MANAGE),
  validateDepartmentId,
  param("assetId").isMongoId().withMessage("Invalid asset ID"),
  validateAsset,
  updateDepartmentAsset
);

// DELETE /api/departments/:id/assets/:assetId - Remove asset from department
router.delete(
  "/:id/assets/:assetId",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_ASSET_MANAGE),
  validateDepartmentId,
  param("assetId").isMongoId().withMessage("Invalid asset ID"),
  removeAssetFromDepartment
);

// Goal management routes
// POST /api/departments/:id/goals - Add goal to department
router.post(
  "/:id/goals",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_GOAL_MANAGE),
  validateDepartmentId,
  validateGoal,
  addGoalToDepartment
);

// PUT /api/departments/:id/goals/:goalId - Update department goal
router.put(
  "/:id/goals/:goalId",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_GOAL_MANAGE),
  validateDepartmentId,
  param("goalId").isMongoId().withMessage("Invalid goal ID"),
  validateGoal,
  updateDepartmentGoal
);

// Budget management routes
// PUT /api/departments/:id/budget - Update department budget
router.put(
  "/:id/budget",
  protect,
  authorizePermissions(PERMISSIONS.DEPARTMENT_BUDGET_MANAGE),
  validateDepartmentId,
  validateBudget,
  updateDepartmentBudget
);

export default router;
