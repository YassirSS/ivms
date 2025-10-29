import mongoose from "mongoose";
import { BUS_FEATURES, DEPARTMENTS } from "../constants/enums";

const busSchema = new mongoose.Schema(
  {
    fleetNumber: {
      type: String,
      required: [true, "Please provide a fleet number"],
      unique: true,
      trim: true,
      maxlength: [18, "Fleet number cannot be more than 18 characters"],
      validate: {
        validator: function (v) {
          return /^\d+$/.test(v); // returns true only if all digits
        },
        message: "Fleet number must contain numbers only",
      },
    },

    // 3 letters, uppercase A-Z
    plateLetters: {
      type: String,
      required: [true, "Please provide plate letters"],
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, "Plate letters must be exactly 3 A-Z characters"],
      index: true,
    },

    // 4 digits, keep as string to preserve leading zeros
    plateDigits: {
      type: String,
      required: [true, "Please provide plate digits"],
      trim: true,
      match: [/^\d{4}$/, "Plate digits must be exactly 4 numbers"],
      index: true,
    },

    // Canonical combined form for uniqueness & quick exact match
    // e.g. "ABC1234"
    plateNumber: {
      type: String,
      unique: true,
      index: true,
      // no direct user input; we derive it in a hook
    },
    // description: {
    //   type: String,
    //   required: [true, "Please provide bus description"],
    //   trim: true,
    //   maxlength: [200, "Description cannot be more than 200 characters"],
    // },
    // I could remove the validation as the bus capacity could be determined by the bus type
    passengerCapacity: {
      type: Number,
      required: [true, "Please provide passenger capacity"],
      min: [10, "Capacity must be at least 10"],
      max: [100, "Capacity cannot exceed 100"],
    },
    features: {
      type: [String],
      default: [],
      validate: [
        {
          // only allow values from the enum
          validator: (arr) =>
            arr.every((v) => Object.values(BUS_FEATURES).includes(v)),
          message: "One or more features are invalid",
        },
        {
          // no duplicates
          validator: (arr) => new Set(arr).size === arr.length,
          message: "Duplicate features are not allowed",
        },
      ],
    },
    busType: {
      type: String,
      required: [true, "Please enter the type"],
      trim: true,
      uppercase: true,
    },
    manufacturer: {
      type: String,
      required: [true, "Please enter the manufacturer"],
      trim: true,
      uppercase: true, // normalize (e.g., "ANKAI", "GOLDEN DRAGON")
    },
    modelYear: {
      type: Number,
      required: true,
      min: [1990, "Model year must be >= 1990"],
      validate: {
        validator: (v) => v <= new Date().getFullYear() + 1,
        message: "Model year cannot be in the far future",
      },
    },

    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true, // optional but useful
      maxlength: [25, "Maximum 25 characters"],
      // optional regex: allow letters/numbers, exclude I,O,Q like VIN
      match: [/^[A-HJ-NPR-Z0-9\-]{6,25}$/, "Invalid chassis number format"],
    },
    engineNumber: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [20, "Engine number cannot exceed 20 characters"],
      match: [/^[A-Z0-9-]*$/, "Invalid engine number format"],
    },
    registrationExpiry: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date("2000-01-01"); // avoid nonsense dates
        },
        message: "Registration expiry date is not valid.",
      },
    },
    insuranceExpiry: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date("2000-01-01");
        },
        message: "Insurance expiry date is not valid.",
      },
    },
    driver: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    department: {
      type: String,
      enum: Object.values(DEPARTMENTS),
      default: DEPARTMENTS.BUS_STORAGE,
      required: [true, "Please specify department"],
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
busSchema.index({ plateLetters: 1, plateDigits: 1 }, { unique: true });
busSchema.index({ department: 1 });
busSchema.index({ driver: 1 }, { unique: true, sparse: true });
busSchema.index({ isActive: 1 });
busSchema.index({ createdBy: 1 });

busSchema.virtual("registrationDaysLeft").get(function () {
  if (!this.registrationExpiry) return null;
  return Math.ceil(
    (this.registrationExpiry - Date.now()) / (1000 * 60 * 60 * 24)
  );
});

busSchema.virtual("insuranceDaysLeft").get(function () {
  if (!this.insuranceExpiry) return null;
  return Math.ceil((this.insuranceExpiry - Date.now()) / (1000 * 60 * 60 * 24));
});

// Method to assign driver
busSchema.methods.assignDriver = function (driverId) {
  this.driver = driverId;
  return this.save();
};

// Method to unassign driver
busSchema.methods.unassignDriver = function () {
  this.driver = null;
  return this.save();
};

// Static method to find available buses (active and no driver assigned)
busSchema.statics.findAvailable = function (department) {
  const query = {
    isActive: true,
    driver: null,
  };

  if (department) {
    query.department = department;
  }

  return this.find(query);
};

// Static method to get bus statistics
busSchema.statics.getBusStats = function (department) {
  const matchStage = { isActive: true };
  if (department) {
    matchStage.department = department;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBuses: { $sum: 1 },
        busesWithDrivers: {
          $sum: { $cond: [{ $ne: ["$driver", null] }, 1, 0] },
        },
        busesWithoutDrivers: {
          $sum: { $cond: [{ $eq: ["$driver", null] }, 1, 0] },
        },
        totalCapacity: { $sum: "$passengerCapacity" },
        averageCapacity: { $avg: "$passengerCapacity" },
      },
    },
  ]);
};

// Pre-save middleware
busSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

busSchema.pre("validate", function (next) {
  if (this.plateLetters && this.plateDigits) {
    this.plateNumber = `${this.plateLetters}${this.plateDigits}`;
  }
  next();
});

// Set virtual fields to be included in JSON
busSchema.set("toJSON", { virtuals: true });
busSchema.set("toObject", { virtuals: true });

export default mongoose.model("Bus", busSchema);
