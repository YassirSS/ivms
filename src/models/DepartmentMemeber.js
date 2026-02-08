// models/DepartmentMember.js
import mongoose from "mongoose";
import { USER_ROLE } from "../constants/enums";

const { Schema } = mongoose;

const DepartmentMemberSchema = new Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    level: { type: Number, min: 1, index: true, default: 1 }, // 1 = top in that dept

    /** Single-manager hierarchy (adjacency list). For matrix orgs, make it an array. */
    reportsTo: {
      type: Schema.Types.ObjectId,
      ref: "DepartmentMember",
      default: null,
    },

    /** Optional materialized path cache for fast subtree queries (top → parent) */
    path: [{ type: Schema.Types.ObjectId, ref: "DepartmentMember" }],

    title: String,
    isPrimary: { type: Boolean, default: true },
  },
  { timestamps: true, strict: "throw", minimize: false }
);

DepartmentMemberSchema.index({ department: 1, user: 1 }, { unique: true });
DepartmentMemberSchema.index({ reportsTo: 1 });
DepartmentMemberSchema.index({ department: 1, level: 1 });

/** Helper to add a member and compute level/path */
DepartmentMemberSchema.statics.addMember = async function ({
  department,
  user,
  role,
  reportsTo = null,
  title,
  isPrimary = true,
}) {
  let level = 1;
  let path = [];

  if (reportsTo) {
    const parent = await this.findById(reportsTo).lean();
    if (!parent || String(parent.department) !== String(department)) {
      throw new Error("reportsTo must be within the same department");
    }
    level = (parent.level || 0) + 1;
    path = [...(parent.path || []), parent._id];
  }

  return this.create({
    department,
    user,
    role,
    reportsTo,
    level,
    path,
    title,
    isPrimary,
  });
};

/** Change manager; guard against cycles; recompute level/path */
DepartmentMemberSchema.methods.reassignTo = async function (newManagerId) {
  if (!newManagerId) {
    this.reportsTo = null;
    this.level = 1;
    this.path = [];
    return this.save();
  }

  const DepartmentMember = this.constructor;
  const parent = await DepartmentMember.findById(newManagerId).lean();

  if (!parent || String(parent.department) !== String(this.department)) {
    throw new Error("New manager must be in the same department");
  }

  // cycle guard: parent cannot be in my subtree
  if (
    String(parent._id) === String(this._id) ||
    (parent.path || []).some((id) => String(id) === String(this._id))
  ) {
    throw new Error("Cannot assign a descendant as manager (cycle)");
  }

  this.reportsTo = parent._id;
  this.level = (parent.level || 0) + 1;
  this.path = [...(parent.path || []), parent._id];
  return this.save();
};

// ⬇️ DOWNLINE (full subtree under a manager)
DepartmentMemberSchema.statics.getDownline = function (memberId) {
  return this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(memberId) } },
    {
      $graphLookup: {
        from: this.collection.name, // "departmentmembers" by default
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "reportsTo",
        as: "subordinates",
        depthField: "depth",
      },
    },
  ]);
};

// ⬇️ UPLINE (chain of command above a member)
DepartmentMemberSchema.statics.getUpline = function (memberId) {
  return this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(memberId) } },
    {
      $graphLookup: {
        from: this.collection.name,
        startWith: "$reportsTo",
        connectFromField: "reportsTo",
        connectToField: "_id",
        as: "managers",
        depthField: "depth",
      },
    },
    { $addFields: { managers: { $reverseArray: "$managers" } } }, // top → direct manager
  ]);
};

export default mongoose.model("DepartmentMember", DepartmentMemberSchema);
