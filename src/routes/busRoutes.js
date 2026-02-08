import express from "express";
import {
  getBuses,
  getBus,
  createBus,
  updateBus,
  deleteBus,
  assignDriver,
  unassignDriver,
  getBusStats,
  getAvailableBuses,
  updateBusMaintenanceStatus,
  reassignDriver,
  getDriverBus,
} from "../controllers/busController.js";
import {
  validateCreateBus,
  validateUpdateBus,
  validateAssignDriver,
  validateBusId,
  validateBusQuery,
} from "../middleware/busValidation.js";
import { protect, authorizePermissions } from "../middleware/auth.js";
import { PERMISSIONS } from "../acl/index.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/buses/stats
// @desc    Get bus statistics
// @access  Private
router.get("/stats", getBusStats);

// @route   GET /api/buses/available
// @desc    Get available buses (no driver assigned)
// @access  Private
router.get("/available", getAvailableBuses);

// @route   GET /api/buses
// @desc    Get all buses with filtering, pagination, and search
// @access  Private
router.get("/", validateBusQuery, getBuses);

// @route   GET /api/buses/:id
// @desc    Get single bus by ID
// @access  Private
router.get("/:id", validateBusId, getBus);

// @route   POST /api/buses
// @desc    Create new bus
// @access  Private (permission)
router.post(
  "/",
  authorizePermissions(PERMISSIONS.BUS_CREATE),
  validateCreateBus,
  createBus
);

// @route   PUT /api/buses/:id
// @desc    Update bus
// @access  Private (permission)
router.put(
  "/:id",
  authorizePermissions(PERMISSIONS.BUS_UPDATE),
  validateUpdateBus,
  updateBus
);

// @route   PUT /api/buses/:id/maintenance
// @desc    Update bus maintenance status (permission-driven)
// @access  Private
router.put(
  "/:id/maintenance",
  authorizePermissions(PERMISSIONS.BUS_MAINTENANCE_VIEW),
  validateBusId,
  updateBusMaintenanceStatus
);

// @route   POST /api/buses/reassign-driver
// @desc    Reassign driver between buses
// @access  Private (permission)
router.post(
  "/reassign-driver",
  authorizePermissions(PERMISSIONS.BUS_ASSIGN_DRIVER),
  reassignDriver
);

// @route   GET /api/buses/my-bus
// @desc    Get driver's assigned bus
// @access  Private (permission)
router.get("/my-bus", authorizePermissions(PERMISSIONS.BUS_VIEW), getDriverBus);

// @route   DELETE /api/buses/:id
// @desc    Delete bus (soft delete)
// @access  Private (permission)
router.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.BUS_DELETE),
  validateBusId,
  deleteBus
);

// @route   PUT /api/buses/:id/assign-driver
// @desc    Assign driver to bus
// @access  Private (permission)
router.put(
  "/:id/assign-driver",
  authorizePermissions(PERMISSIONS.BUS_ASSIGN_DRIVER),
  validateAssignDriver,
  assignDriver
);

// @route   PUT /api/buses/:id/unassign-driver
// @desc    Unassign driver from bus
// @access  Private (permission)
router.put(
  "/:id/unassign-driver",
  authorizePermissions(PERMISSIONS.BUS_ASSIGN_DRIVER),
  validateBusId,
  unassignDriver
);

export default router;
