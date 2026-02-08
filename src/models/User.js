import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { DEPARTMENTS, USER_ROLE } from "../constants/enums.js";
import {
  PERMISSIONS,
  computeUserPermissions,
  JOB_TITLE_BUNDLES,
} from "../acl/index.js";

// Define a reusable address subdocument
const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

// Role-specific embedded profiles (no separate _id)
const DriverProfileSchema = new mongoose.Schema(
  {
    licenseNumber: { type: String, trim: true },
    licenseExpiry: { type: Date },
    iqamaNumber: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    badgeId: { type: String, trim: true },
    // Optional nested address for drivers
    address: { type: AddressSchema, default: undefined },
  },
  { _id: false }
);

const EmployeeProfileSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true },
    title: { type: String, trim: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emergencyContact: { type: String, trim: true },
    // Optional nested address for employees
    address: { type: AddressSchema, default: undefined },
  },
  { _id: false }
);

const ContractorProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    contractId: { type: String, trim: true },
    contractStart: { type: Date },
    contractEnd: { type: Date },
    contactPhone: { type: String, trim: true },
    // Optional nested address for contractors
    address: { type: AddressSchema, default: undefined },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    phone: { type: String, trim: true },
    // Root-level address for the user
    address: { type: AddressSchema, default: undefined },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      default: USER_ROLE.USER,
    },
    // High-level user type for profile selection
    userType: {
      type: String,
      enum: ["driver", "employee", "contractor"],
      required: true,
      index: true,
    },
    isSeasonal: { type: Boolean, default: false, index: true },
    permissions: {
      type: [String],
      default: [], // e.g. ["inspection.create_request", "bus.view"]
    },
    department: {
      type: String,
      enum: Object.values(DEPARTMENTS),
      required: [true, "Please specify a department"],
    },
    // Business position / job title (data_entry, gov_insurance_manager, etc.)
    jobTitle: {
      type: String,
      enum: Object.keys(JOB_TITLE_BUNDLES),
      required: [true, "Please specify a valid job title"],
      trim: true,
    },
    // Role-specific embedded profiles
    driverProfile: { type: DriverProfileSchema, default: undefined },
    employeeProfile: { type: EmployeeProfileSchema, default: undefined },
    contractorProfile: { type: ContractorProfileSchema, default: undefined },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordCode: String,
    resetPasswordCodeExpire: Date,
    lastLogin: Date,
    lastPasswordChange: Date,
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ jobTitle: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ isSeasonal: 1 });

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  // Only run this if password was modified (or new)
  if (!this.isModified("password")) {
    console.log("⚪ Password not modified — skipping hashing");
    return next();
  }

  console.log("🔸 Original password (plain):", this.password);

  // Hash the password
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  console.log("✅ Hashed password:", this.password);

  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      department: this.department,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate password reset code
userSchema.methods.getResetPasswordCode = function () {
  // Generate 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store code directly (no hashing needed for codes)
  this.resetPasswordCode = resetCode;

  // Set expire (10 minutes)
  this.resetPasswordCodeExpire = Date.now() + 10 * 60 * 1000;

  return resetCode;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Effective permissions helpers
userSchema.methods.getEffectivePermissions = function () {
  return computeUserPermissions(this);
};

userSchema.methods.hasPermission = function (perm) {
  const perms = this.getEffectivePermissions();
  // Role-based bypass: super_admin can do anything
  if (this.role === "super_admin") return true;
  return perms.includes(perm);
};

export default mongoose.model("User", userSchema);
