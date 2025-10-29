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
    } = req.query;

    // Build query
    let query = {};

    // Filter by department based on user role
    if (req.user.role !== "manager") {
      query.department = req.user.department;
    } else if (department) {
      query.department = department;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { plateNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Only show active buses unless specifically requested
    if (!req.query.includeInactive) {
      query.isActive = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
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
      return res.status(404).json({
        success: false,
        error: "Bus not found",
      });
    }

    // Check if user has access to this bus
    if (req.user.role !== "manager" && bus.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this bus",
      });
    }

    res.status(200).json({
      success: true,
      data: bus,
    });
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    let { orFilters, newCombinedPlate } = buildDuplicateFilters(req.body);

    for (const f of UNIQUE_FIELDS) {
      if (req.body[f]) orFilters.push({ [f]: req.body[f] });
    }

    if (orFilters.length) {
      const duplicate = await Bus.findOne({ $or: orFilters });
      if (duplicate) {
        if (newCombinedPlate && duplicate.plateNumber === newCombinedPlate)
          return res
            .status(400)
            .json({ success: false, error: "Plate number already exists" });
        if (
          req.body.fleetNumber &&
          duplicate.fleetNumber === req.body.fleetNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Fleet number already exists" });
        if (
          req.body.chassisNumber &&
          duplicate.chassisNumber === req.body.chassisNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Chassis number already exists" });
        if (
          req.body.engineNumber &&
          duplicate.engineNumber === req.body.engineNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Engine number already exists" });
      }
    }

    if (driver) {
      const driverUser = await User.findById(driver);
      if (!driverUser) {
        return res.status(400).json({
          success: false,
          error: "Driver not found",
        });
      }

      if (driverUser.role !== "driver") {
        return res.status(400).json({
          success: false,
          error: "Selected user is not a driver",
        });
      }

      // Check if driver is already assigned to another bus
      const existingAssignment = await Bus.findOne({
        driver: driver,
        isActive: true,
      });
      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          error: "Driver is already assigned to another bus",
        });
      }
    }

    // Create bus
    const bus = await Bus.create({
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
      driver: driver || null,
      department: department || req.user.department,
      createdBy: req.user._id,
    });

    // Populate the created bus
    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      data: bus,
    });
  } catch (error) {
    console.error("Error creating bus:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Bus with this plate number already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Server error while creating bus",
    });
  }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private (Manager only)
export const updateBus = async (req, res) => {
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

    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: "Bus not found",
      });
    }

    // Check if user has permission to update this bus
    if (req.user.role !== "manager" && bus.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this bus",
      });
    }

    // ✅ Unified duplicate check (update)
    let { orFilters, newCombinedPlate } = buildDuplicateFilters(req.body, bus);

    for (const f of UNIQUE_FIELDS) {
      if (req.body[f]) orFilters.push({ [f]: req.body[f] });
    }

    if (orFilters.length) {
      const duplicate = await Bus.findOne({
        $or: orFilters,
        _id: { $ne: bus._id }, // 👈 exclude this same bus
      });

      if (duplicate) {
        if (newCombinedPlate && duplicate.plateNumber === newCombinedPlate)
          return res
            .status(400)
            .json({ success: false, error: "Plate number already exists" });
        if (
          req.body.fleetNumber &&
          duplicate.fleetNumber === req.body.fleetNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Fleet number already exists" });
        if (
          req.body.chassisNumber &&
          duplicate.chassisNumber === req.body.chassisNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Chassis number already exists" });
        if (
          req.body.engineNumber &&
          duplicate.engineNumber === req.body.engineNumber
        )
          return res
            .status(400)
            .json({ success: false, error: "Engine number already exists" });
      }
    }

    // If driver is being changed, validate the new driver
    if (Object.prototype.hasOwnProperty.call(req.body, "driver")) {
      const driver = req.body.driver; // could be an id, null, or empty

      // Unassign case: allow driver = null
      if (driver === null) {
        bus.driver = null;
      } else if (driver) {
        // Basic id format guard
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

        // Optional: enforce same department
        // if (driverUser.department?.toString() !== (bus.department?.toString() || req.body.department)) {
        //   return res.status(400).json({ success: false, error: "Driver belongs to a different department" });
        // }

        // Prevent assigning one active driver to multiple active buses (exclude current bus)
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

        bus.driver = driver; // safe to set
      } else {
        // Empty string or undefined -> ignore (don’t change)
      }
    }

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
    ];

    // This code is to replace the many if that checks if there is a change happend for a particular field.
    // Note that updatableFields replaces req.body so that no need for duplication of fields, and in req.body it has not forEach loop.
    Object.entries(req.body).forEach(([key, value]) => {
      if (updatableFields.includes(key) && value !== undefined) {
        bus[key] = value;
      }
    });

    bus.lastUpdatedBy = req.user._id;

    await bus.save();

    // Populate the updated bus
    await bus.populate("driver", "name email");
    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    res.status(200).json({
      success: true,
      data: bus,
    });
  } catch (error) {
    console.error("Error updating bus:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Bus with this plate number already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Server error while updating bus",
    });
  }
};

// @desc    Delete bus
// @route   DELETE /api/buses/:id
// @access  Private (Manager only)
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: "Bus not found",
      });
    }

    // Check if user has permission to delete this bus
    if (req.user.role !== "manager" && bus.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this bus",
      });
    }

    // Soft delete - set isActive to false
    bus.isActive = false;
    bus.driver = null; // Unassign driver
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting bus",
    });
  }
};

// @desc    Assign driver to bus
// @route   PUT /api/buses/:id/assign-driver
// @access  Private (Manager only)
export const assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: "Driver ID is required",
      });
    }

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: "Bus not found",
      });
    }

    // Check if user has permission
    if (
      req.user.role !== "manager" &&
      req.user.role !== "admin" &&
      bus.department !== req.user.department
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to assign driver to this bus",
      });
    }

    // Validate driver
    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(400).json({
        success: false,
        error: "Driver not found",
      });
    }

    if (driver.role !== "driver" && driver.role !== "user") {
      return res.status(400).json({
        success: false,
        error: "Selected user is not a driver",
      });
    }

    // Check if driver is already assigned to another bus
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

    // Assign driver
    await bus.assignDriver(driverId);
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    // Populate and return updated bus
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
    res.status(500).json({
      success: false,
      error: "Server error while assigning driver",
    });
  }
};

// @desc    Unassign driver from bus
// @route   PUT /api/buses/:id/unassign-driver
// @access  Private (Manager only)
export const unassignDriver = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: "Bus not found",
      });
    }

    // Check if user has permission
    if (
      req.user.role !== "manager" &&
      req.user.role !== "admin" &&
      bus.department !== req.user.department
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to unassign driver from this bus",
      });
    }

    if (!bus.driver) {
      return res.status(400).json({
        success: false,
        error: "No driver assigned to this bus",
      });
    }

    // Unassign driver
    await bus.unassignDriver();
    bus.lastUpdatedBy = req.user._id;
    await bus.save();

    // Populate and return updated bus
    await bus.populate("createdBy", "name email");
    await bus.populate("lastUpdatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Driver unassigned successfully",
      data: bus,
    });
  } catch (error) {
    console.error("Error unassigning driver:", error);
    res.status(500).json({
      success: false,
      error: "Server error while unassigning driver",
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
