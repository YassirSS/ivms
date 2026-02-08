import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import database connection
import connectDB from "./src/config/database.js";

// Import routes
import authRoutes from "./src/routes/auth.js";
import busRoutes from "./src/routes/busRoutes.js";
import departmentRoutes from "./src/routes/departmentRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import aclRoutes from "./src/routes/aclRoutes.js";

// Import middleware
import errorHandler from "./src/middleware/errorHandler.js";

// Import cron service
import { startAllCronJobs } from "./src/services/cronService.js";

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bus Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/acl", aclRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚌 Bus Management System server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);

  // Start cron jobs after server is running
  startAllCronJobs();
  console.log(`⏰ Cron jobs started successfully`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});
