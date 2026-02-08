import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import User from "../src/models/User.js";
import Department from "../src/models/Department.js";
import { DEPARTMENTS, USER_ROLE } from "../src/constants/enums.js";

// Load environment variables
dotenv.config();

const seedManager = async () => {
  try {
    // Connect to database
    console.log("🔄 Attempting to connect to MongoDB...");
    console.log("📍 MongoDB URI:", process.env.MONGODB_URI ? "Set" : "Not set");

    await connectDB();

    // Wait a moment for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if we're actually connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database connection not established");
    }

    console.log("📊 Successfully connected to MongoDB");

    // Check if manager already exists
    const existingManager = await User.findOne({
      email: "KommanderYassir@gmail.com",
    });
    if (existingManager) {
      console.log("⚠️  Manager with email mrbeboteam@gmail.com already exists");
      console.log("Manager details:", {
        name: existingManager.name,
        email: existingManager.email,
        role: existingManager.role,
        department: existingManager.department,
        isActive: existingManager.isActive,
      });
      process.exit(0);
    }

    // Ensure bus_management department exists
    let department = await Department.findOne({
      name: DEPARTMENTS.BUS_STORAGE,
    });
    if (!department) {
      department = await Department.create({
        name: DEPARTMENTS.BUS_STORAGE,
        description:
          "Bus Management Department - Handles bus operations, scheduling, and fleet management",
      });
      console.log("✅ Created bus_storage department");
    }

    // Create the first manager
    const manager = await User.create({
      name: "System Manager",
      email: "KommanderYassir@gmail.com",
      password: "Manager123!", // Default password - should be changed after first login
      role: USER_ROLE.SUPER_ADMIN,
      department: DEPARTMENTS.BUS_STORAGE,
      isActive: true,
      isEmailVerified: true, // Skip email verification for the first manager
    });

    console.log("🎉 Successfully created first manager!");
    console.log("Manager details:");
    console.log("📧 Email:", manager.email);
    console.log("👤 Name:", manager.name);
    console.log("🔑 Role:", manager.role);
    console.log("🏢 Department:", manager.department);
    console.log("🔒 Default Password: Manager123!");
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Please change the default password after first login!"
    );
    console.log("🔗 Login at: http://localhost:5001/api/auth/login");
  } catch (error) {
    console.error("❌ Error creating manager:", error.message);
    if (error.code === 11000) {
      console.log("💡 This usually means the user already exists");
    }
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run the seed script
seedManager();
