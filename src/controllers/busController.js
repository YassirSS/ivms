import mongoose from "mongoose"; // ✅ needed for ObjectId validation in updateBus
import Bus from "../models/Bus.js";
import User from "../models/User.js";
import { validationResult } from "express-validator";
import { buildDuplicateFilters } from "../utils/busDuplicateCheck.js";

// @desc    Get all buses
// @route   GET /api/buses
// @access  Private (Manager and User)
export const getBuses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      department,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeInactive,
    } = req.query;

    const query = {};

    console.log("Logged-in role:", req.user.role);

    // Department filter by role
    if (req.user.role !== "super_admin") {
      query.department = req.user.department;
    } else if (department) {
      query.department = department;
    }

    // Search
    if (search) {
      query.$or = [
        { plateNumber: { $regex: search, $options: "i" } },
        { fleetNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Only active unless requested
    if (!includeInactive) {
      query.isActive = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const buses = await Bus.find(query)
      .populate("driver", "name email")
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Bus.countDocuments(query);

    res.status(200).json({
      success: true,
      count: buses.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      data: buses,
    });
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching buses",
    });
  }
};

// @desc    Get single bus
// @route   GET /api/buses/:id
// @access  Private (Manager and User)
export const getBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate("driver", "name email phone")
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");

    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (
      req.user.role !== "super_admin" &&
      bus.department !== req.user.department
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to access this bus" });
    }

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    console.error("Error fetching bus:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching bus",
    });
  }
};

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private (Manager only)
export const createBus = async (req, res) => {
  try {
    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    // (Optional) Auth guard: createdBy depends on req.user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated — req.user missing",
      });
    }

    // ✅ Destructure the fields you later use
    const {
      plateLetters,
      plateDigits,
      features,
      busType,
      manufacturer,
      modelYear,
      chassisNumber,
      engineNumber,
      registrationExpiry,
      insuranceExpiry,
      fleetNumber,
      passengerCapacity,
      driver, // <— needed below
      department,
    } = req.body;

    // ✅ Duplicate checks (create): combined plate + unique fields via helper
    const { orFilters, newCombinedPlate } = buildDuplicateFilters(req.body);
    if (orFilters.length) {
      const duplicate = await Bus.findOne({ $or: orFilters })
        .select("plateNumber fleetNumber chassisNumber engineNumber")
        .lean();

      if (duplicate) {
        if (newCombinedPlate && duplicate.plateNumber === newCombinedPlate) {
          return res
            .status(400)
            .json({ success: false, error: "Plate number already exists" });
        }
        if (fleetNumber && duplicate.fleetNumber === fleetNumber) {
          return res
            .status(400)
            .json({ success: false, error: "Fleet number already exists" });
        }
        if (chassisNumber && duplicate.chassisNumber === chassisNumber) {
          return res
            .status(400)
            .json({ success: false, error: "Chassis number already exists" });
        }
        if (engineNumber && duplicate.engineNumber === engineNumber) {
          return res
            .status(400)
            .json({ success: false, error: "Engine number already exists" });
        }
      }
    }

    // ✅ Driver checks (only if provided)
    const driverId = driver;
    if (driverId) {
      const driverUser = await User.findById(driverId).select("role");
      if (!driverUser) {
        return res
          .status(400)
          .json({ success: false, error: "Driver not found" });
      }
      if (driverUser.role !== "driver") {
        return res
          .status(400)
          .json({ success: false, error: "Selected user is not a driver" });
      }
      const existingAssignment = await Bus.findOne({
        driver: driverId,
        isActive: true,
      }).select("_id");
      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          error: "Driver is already assigned to another bus",
        });
      }
    }

    // ✅ Build payload; omit empty optional uniques
    const payload = {
      plateLetters,
      plateDigits,
      features: Array.isArray(features) ? features : [],
      busType,
      manufacturer,
      modelYear,
      registrationExpiry,
      insuranceExpiry,
      fleetNumber,
      passengerCapacity,
      department: department || req.user.department,
      createdBy: req.user._id,
    };
    if (chassisNumber) payload.chassisNumber = chassisNumber;
    if (engineNumber) payload.engineNumber = engineNumber;
    if (driverId) payload.driver = driverId;

    // Create
    const bus = await Bus.create(payload);
    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");

    return res.status(201).json({ success: true, data: bus });
  } catch (error) {
    console.error("Error creating bus:", error);

    // Surface helpful errors
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {}).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, error: "Validation failed", details });
    }
    if (error.code === 11000) {
      const fields = Object.keys(error.keyPattern || {});
      const msg = fields.includes("plateNumber")
        ? "Plate number already exists"
        : fields.includes("fleetNumber")
        ? "Fleet number already exists"
        : fields.includes("chassisNumber")
        ? "Chassis number already exists"
        : fields.includes("engineNumber")
        ? "Engine number already exists"
        : "Duplicate value";
      return res.status(400).json({ success: false, error: msg });
    }

    return res
      .status(500)
      .json({ success: false, error: "Server error while creating bus" });
  }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private (Manager only)
export const updateBus = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    // Authorization
    if (req.user.role !== "manager" && bus.department !== req.user.department) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to update this bus" });
    }

    // ✅ Unified duplicate check (update) via helper
    const { orFilters, newCombinedPlate } = buildDuplicateFilters(
      req.body,
      bus
    );
    if (orFilters.length) {
      const duplicate = await Bus.findOne({ $or: orFilters })
        .select("plateNumber fleetNumber chassisNumber engineNumber _id")
        .lean();

      if (duplicate) {
        if (newCombinedPlate && duplicate.plateNumber === newCombinedPlate) {
          return res
            .status(400)
            .json({ success: false, error: "Plate number already exists" });
        }
        if (
          req.body.fleetNumber &&
          duplicate.fleetNumber === req.body.fleetNumber
        ) {
          return res
            .status(400)
            .json({ success: false, error: "Fleet number already exists" });
        }
        if (
          req.body.chassisNumber &&
          duplicate.chassisNumber === req.body.chassisNumber
        ) {
          return res
            .status(400)
            .json({ success: false, error: "Chassis number already exists" });
        }
        if (
          req.body.engineNumber &&
          duplicate.engineNumber === req.body.engineNumber
        ) {
          return res
            .status(400)
            .json({ success: false, error: "Engine number already exists" });
        }
      }
    }

    // ✅ Driver change handling (if 'driver' key present)
    if (Object.prototype.hasOwnProperty.call(req.body, "driver")) {
      const driver = req.body.driver; // may be id, null, "", or undefined

      if (driver === null) {
        bus.driver = null; // unassign
      } else if (driver) {
        if (!mongoose.Types.ObjectId.isValid(driver)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid driver id" });
        }

        const driverUser = await User.findById(driver).select(
          "role name email department"
        );
        if (!driverUser) {
          return res
            .status(400)
            .json({ success: false, error: "Driver not found" });
        }
        if (driverUser.role !== "driver") {
          return res
            .status(400)
            .json({ success: false, error: "Selected user is not a driver" });
        }

        const existingAssignment = await Bus.findOne({
          driver,
          isActive: true,
          _id: { $ne: bus._id },
        }).select("_id");
        if (existingAssignment) {
          return res.status(400).json({
            success: false,
            error: "Driver is already assigned to another active bus",
          });
        }

        bus.driver = driver;
      }
      // else empty string/undefined -> ignore (no change)
    }

    // ✅ Apply only allowed updates
    const updatableFields = [
      "plateLetters",
      "plateDigits",
      "busType",
      "manufacturer",
      "modelYear",
      "chassisNumber",
      "engineNumber",
      "registrationExpiry",
      "insuranceExpiry",
      "fleetNumber",
      "passengerCapacity",
      "driver",
      "department",
      "isActive",
      "features",
    ];

    Object.entries(req.body).forEach(([key, value]) => {
      if (updatableFields.includes(key) && value !== undefined) {
        bus[key] = value;
      }
    });

    bus.lastUpdatedBy = req.user._id;

    await bus.save();
    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    return res.status(200).json({ success: true, data: bus });
  } catch (error) {
    console.error("Error updating bus:", error);

    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {}).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, error: "Validation failed", details });
    }
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, error: "Duplicate value for a unique field" });
    }

    return res
      .status(500)
      .json({ success: false, error: "Server error while updating bus" });
  }
};

// @desc    Delete bus (soft)
// @route   DELETE /api/buses/:id
// @access  Private (Manager only)
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (req.user.role !== "manager" && bus.department !== req.user.department) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to delete this bus" });
    }

    bus.isActive = false;
    bus.driver = null;
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    res
      .status(200)
      .json({ success: true, message: "Bus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while deleting bus" });
  }
};

// @desc    Assign driver to bus
// @route   PUT /api/buses/:id/assign-driver
// @access  Private (Manager only)
export const assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res
        .status(400)
        .json({ success: false, error: "Driver ID is required" });
    }

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (
      req.user.role !== "manager" &&
      req.user.role !== "admin" &&
      bus.department !== req.user.department
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to assign driver" });
    }

    const driver = await User.findById(driverId);
    if (!driver) {
      return res
        .status(400)
        .json({ success: false, error: "Driver not found" });
    }
    if (driver.role !== "driver" && driver.role !== "user") {
      return res
        .status(400)
        .json({ success: false, error: "Selected user is not a driver" });
    }

    const existingAssignment = await Bus.findOne({
      driver: driverId,
      isActive: true,
      _id: { $ne: bus._id },
    });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: "Driver is already assigned to another bus",
      });
    }

    await bus.assignDriver(driverId);
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Driver assigned successfully",
      data: bus,
    });
  } catch (error) {
    console.error("Error assigning driver:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while assigning driver" });
  }
};

// @desc    Unassign driver from bus
// @route   PUT /api/buses/:id/unassign-driver
// @access  Private (Manager only)
export const unassignDriver = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (
      req.user.role !== "manager" &&
      req.user.role !== "admin" &&
      bus.department !== req.user.department
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to unassign driver" });
    }

    if (!bus.driver) {
      return res
        .status(400)
        .json({ success: false, error: "No driver assigned to this bus" });
    }

    await bus.unassignDriver();
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Driver unassigned successfully",
      data: bus,
    });
  } catch (error) {
    console.error("Error unassigning driver:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while unassigning driver" });
  }
};

// @desc    Reassign driver between buses
// @route   PUT /api/buses/reassign-driver
// @access  Private (Manager only)
export const reassignDriver = async (req, res) => {
  try {
    const { driverId, fromBusId, toBusId } = req.body;

    if (!driverId || !toBusId) {
      return res.status(400).json({
        success: false,
        error: "Driver ID and destination bus ID are required",
      });
    }

    const driver = await User.findById(driverId);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    if (driver.role !== "driver")
      return res
        .status(400)
        .json({ success: false, error: "Selected user is not a driver" });

    const toBus = await Bus.findById(toBusId);
    if (!toBus)
      return res
        .status(404)
        .json({ success: false, error: "Destination bus not found" });
    if (toBus.driver) {
      return res.status(400).json({
        success: false,
        error: "Destination bus already has an assigned driver",
      });
    }

    if (fromBusId) {
      const fromBus = await Bus.findById(fromBusId);
      if (!fromBus) {
        return res
          .status(404)
          .json({ success: false, error: "Source bus not found" });
      }
      if (!fromBus.driver || fromBus.driver.toString() !== driverId) {
        return res.status(400).json({
          success: false,
          error: "Driver is not assigned to the source bus",
        });
      }
      fromBus.driver = null;
      fromBus.lastUpdatedBy = req.user._id;
      await fromBus.save();
    } else {
      const currentAssignment = await Bus.findOne({ driver: driverId });
      if (currentAssignment) {
        currentAssignment.driver = null;
        currentAssignment.lastUpdatedBy = req.user._id;
        await currentAssignment.save();
      }
    }

    toBus.driver = driverId;
    toBus.lastUpdatedBy = req.user._id;
    await toBus.save();
    await toBus.populate("driver", "name email");

    res.status(200).json({
      success: true,
      message: "Driver reassigned successfully",
      data: { bus: toBus },
    });
  } catch (error) {
    console.error("Error reassigning driver:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while reassigning driver" });
  }
};

// @desc    Get driver's bus
// @route   GET /api/buses/my-bus
// @access  Private (Driver)
export const getDriverBus = async (req, res) => {
  try {
    const driverId = req.user._id;
    const bus = await Bus.findOne({
      driver: driverId,
      isActive: false,
    }).populate([
      { path: "driver", select: "name email" },
      { path: "createdBy", select: "name" },
      { path: "lastUpdatedBy", select: "name" },
    ]);

    if (!bus) {
      return res
        .status(404)
        .json({ success: false, error: "No bus is currently assigned to you" });
    }

    res
      .status(200)
      .json({ success: true, data: { bus, department: bus.department } });
  } catch (error) {
    console.error("Error fetching driver's bus:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching driver's bus",
    });
  }
};

// @desc    Update maintenance status (driver or manager)
// @route   PUT /api/buses/:id/maintenance-status
// @access  Private
export const updateBusMaintenanceStatus = async (req, res) => {
  try {
    const { maintenanceStatus, maintenanceNotes } = req.body;

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (
      req.user.role === "driver" &&
      bus.driver?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized - you are not the assigned driver of this bus",
      });
    }

    bus.maintenanceStatus = maintenanceStatus;
    bus.maintenanceNotes = maintenanceNotes;
    bus.lastUpdatedBy = req.user._id;

    await bus.save();
    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    console.error("Error updating bus maintenance status:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating bus maintenance status",
    });
  }
};

// @desc    Get bus statistics
// @route   GET /api/buses/stats
// @access  Private (Manager and User)
export const getBusStats = async (req, res) => {
  try {
    const department =
      req.user.role === "manager" ? req.query.department : req.user.department;

    const stats = await Bus.getBusStats(department);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalBuses: 0,
        busesWithDrivers: 0,
        busesWithoutDrivers: 0,
        totalCapacity: 0,
        averageCapacity: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching bus stats:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching bus statistics",
    });
  }
};

// @desc    Get available buses (no driver assigned)
// @route   GET /api/buses/available
// @access  Private (Manager and User)
export const getAvailableBuses = async (req, res) => {
  try {
    const department =
      req.user.role === "manager" ? req.query.department : req.user.department;

    const availableBuses = await Bus.findAvailable(department)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: availableBuses.length,
      data: availableBuses,
    });
  } catch (error) {
    console.error("Error fetching available buses:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching available buses",
    });
  }
};
