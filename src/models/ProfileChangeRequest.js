import mongoose from "mongoose";

const ProfileChangeRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // target user (driver)
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who submitted (driver or supervisor)
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional explicit supervisor
    fields: [{ type: String, required: true }], // e.g., ["name","phone","driverProfile.emergencyContact"]
    newValues: { type: mongoose.Schema.Types.Mixed, required: true }, // partial doc of requested changes
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "pending_supervisor",
        "rejected_supervisor",
        "pending_hr",
        "approved",
        "rejected_hr",
      ],
      default: "pending_supervisor",
      index: true,
    },
    history: [
      {
        step: { type: String, enum: ["supervisor", "hr"] },
        action: { type: String, enum: ["approved", "rejected"] },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model(
  "ProfileChangeRequest",
  ProfileChangeRequestSchema
);
