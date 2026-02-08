// models/Accident.js
import mongoose from "mongoose";

const accidentSchema = new mongoose.Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    date: { type: Date, required: true, index: true },
    location: String,
    severity: {
      type: String,
      enum: ["minor", "moderate", "major"],
      default: "minor",
    },
    description: String,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Accident", accidentSchema);
