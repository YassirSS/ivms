// models/Department.js
import mongoose from "mongoose";
import { DEPARTMENTS, USER_ROLE } from "../constants/enums.js";

const { MANAGER, EMPLOYEE } = USER_ROLE;

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a department name"],
      enum: Object.values(DEPARTMENTS),
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a department description"],
      maxlength: [500, "Description cannot be more than 500 characters"],
    },

    createdBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    lastUpdatedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    budget: { type: Number, default: 0, min: [0, "Budget cannot be negative"] },
    location: {
      type: String,
      maxlength: [100, "Location cannot be more than 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Please provide a department code"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, "Code must be at least 2 characters"],
      maxlength: [10, "Code cannot be more than 10 characters"],
    },
    contactInfo: {
      phone: {
        type: String,
        match: [/^\+?[\d\s\-\(\)]+$/, "Please provide a valid phone number"],
      },
      email: {
        type: String,
        lowercase: true,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          "Please provide a valid email",
        ],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: "throw",
    minimize: false,
  }
);

departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });

/** Virtual populates (counts) */
departmentSchema.virtual("memberCount", {
  ref: "DepartmentMember",
  localField: "_id",
  foreignField: "department",
  count: true,
});
departmentSchema.virtual("managerCount", {
  ref: "DepartmentMember",
  localField: "_id",
  foreignField: "department",
  match: { role: MANAGER },
  count: true,
});
departmentSchema.virtual("employeeCount", {
  ref: "DepartmentMember",
  localField: "_id",
  foreignField: "department",
  match: { role: EMPLOYEE },
  count: true,
});

/** Cascade delete members when a department is removed */
departmentSchema.pre("findOneAndDelete", async function (next) {
  const deptId = this.getQuery()._id;
  if (deptId) {
    await mongoose.model("DepartmentMember").deleteMany({ department: deptId });
  }
  next();
});

/** Stats without storing managers/employees arrays */
departmentSchema.statics.getDepartmentStats = async function () {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "departmentmembers",
        let: { deptId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$department", "$$deptId"] } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              managers: {
                $sum: { $cond: [{ $eq: ["$role", MANAGER] }, 1, 0] },
              },
              employees: {
                $sum: { $cond: [{ $eq: ["$role", EMPLOYEE] }, 1, 0] },
              },
            },
          },
        ],
        as: "counts",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        budget: 1,
        location: 1,
        createdAt: 1,
        totalEmployees: {
          $ifNull: [{ $arrayElemAt: ["$counts.total", 0] }, 0],
        },
        managerCount: {
          $ifNull: [{ $arrayElemAt: ["$counts.managers", 0] }, 0],
        },
        employeeCount: {
          $ifNull: [{ $arrayElemAt: ["$counts.employees", 0] }, 0],
        },
      },
    },
  ]);
};

export default mongoose.model("Department", departmentSchema);
