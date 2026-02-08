import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { DEPARTMENTS, USER_ROLE } from "../constants/enums.js";
import {
  PERMISSIONS,
  computeUserPermissions,
  JOB_TITLE_BUNDLES,
} from "../config/acl.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    phone: { type: String, trim: true },
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
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    driverProfile: { type: DriverProfileSchema, default: undefined },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordCode: String,
    resetPasswordCodeExpire: Date,
    lastLogin: Date,
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

// Effective permissions = role defaults + explicit user overrides
// userSchema.methods.getEffectivePermissions = function () {
//   const base = ROLE_PERMISSIONS[this.role] || [];
//   const explicit = Array.isArray(this.permissions) ? this.permissions : [];
//   return Array.from(new Set([...base, ...explicit]));
// };

// userSchema.methods.hasPermission = function (perm) {
//   return this.getEffectivePermissions().includes(perm);
// };

userSchema.methods.getEffectivePermissions = function () {
  return computeUserPermissions(this);
};

userSchema.methods.hasPermission = function (perm) {
  const perms = this.getEffectivePermissions();
  // ADMIN_ALL means "can do anything"
  return perms.includes(perm) || perms.includes(PERMISSIONS.ADMIN_ALL);
};

export default mongoose.model("User", userSchema);
