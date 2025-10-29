import mongoose from "mongoose";

const busDetailSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, "Please enter the type"],
  },
  manufacturer: {
    type: String,
    required: [true, "Please enter the manufacturer"],
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
    maxlength: [20, "Too large numbers"],
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
});

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

export default mongoose.model("BusDetails", busDetailSchema);
