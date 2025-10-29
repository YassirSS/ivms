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
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/buses/stats
// @desc    Get bus statistics
// @access  Private (Manager and User)
router.get("/stats", getBusStats);

// @route   GET /api/buses/available
// @desc    Get available buses (no driver assigned)
// @access  Private (Manager and User)
router.get("/available", getAvailableBuses);

// @route   GET /api/buses
// @desc    Get all buses with filtering, pagination, and search
// @access  Private (Manager and User)
router.get("/", validateBusQuery, getBuses);

// @route   GET /api/buses/:id
// @desc    Get single bus by ID
// @access  Private (Manager and User)
router.get("/:id", validateBusId, getBus);

// @route   POST /api/buses
// @desc    Create new bus
// @access  Private (Manager and Admin only)
router.post("/", authorize("manager", "admin"), validateCreateBus, createBus);

// @route   PUT /api/buses/:id
// @desc    Update bus
// @access  Private (Manager and Admin only)
router.put("/:id", authorize("manager", "admin"), validateUpdateBus, updateBus);

// @route   PUT /api/buses/:id/maintenance
// @desc    Update bus maintenance status (for drivers)
// @access  Private (Driver only)
router.put(
  "/:id/maintenance",
  authorize("driver"),
  validateBusId,
  updateBusMaintenanceStatus
);

// @route   POST /api/buses/reassign-driver
// @desc    Reassign driver between buses (for admins and managers)
// @access  Private (Admin and Manager only)
router.post("/reassign-driver", authorize("admin", "manager"), reassignDriver);

// @route   GET /api/buses/my-bus
// @desc    Get driver's assigned bus
// @access  Private (Driver only)
router.get("/my-bus", authorize("driver"), getDriverBus);

// @route   DELETE /api/buses/:id
// @desc    Delete bus (soft delete)
// @access  Private (Manager and Admin only)
router.delete("/:id", authorize("manager", "admin"), validateBusId, deleteBus);

// @route   PUT /api/buses/:id/assign-driver
// @desc    Assign driver to bus
// @access  Private (Manager and Admin only)
router.put(
  "/:id/assign-driver",
  authorize("manager", "admin"),
  validateAssignDriver,
  assignDriver
);

// @route   PUT /api/buses/:id/unassign-driver
// @desc    Unassign driver from bus
// @access  Private (Manager and Admin only)
router.put(
  "/:id/unassign-driver",
  authorize("manager", "admin"),
  validateBusId,
  unassignDriver
);

export default router;
