import Department from "../models/Department.js";
import User from "../models/User.js";
import Bus from "../models/Bus.js";
import asyncHandler from "express-async-handler";
import { validationResult } from "express-validator";

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private (Manager+)
export const getDepartments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    isActive,
    sortBy = "name",
    sortOrder = "asc",
  } = req.query;

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Execute query with pagination
  const departments = await Department.find(query)
    .populate("managers", "name email role")
    .populate("employees", "name email role")
    .populate("createdBy", "name email")
    .populate("lastUpdatedBy", "name email")
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  // Get total count for pagination
  const total = await Department.countDocuments(query);

  res.status(200).json({
    success: true,
    count: departments.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    data: departments,
  });
});

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private (Manager+)
export const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)
    .populate("managers", "name email role phone department")
    .populate("employees", "name email role phone department")
    .populate("createdBy", "name email")
    .populate("lastUpdatedBy", "name email");

  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  // Get department buses
  const buses = await Bus.find({ department: department.name })
    .populate("driver", "name email")
    .select("busNumber plateNumber model status operationalStatus");

  // Add performance summary
  const performanceSummary = department.getPerformanceSummary();

  res.status(200).json({
    success: true,
    data: {
      ...department.toObject(),
      buses,
      performanceSummary,
    },
  });
});

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Super Admin only)
export const createDepartment = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(
      `Validation Error: ${errors
        .array()
        .map((err) => err.msg)
        .join(", ")}`
    );
  }

  // Check if department already exists
  const existingDepartment = await Department.findOne({
    $or: [{ name: req.body.name }, { code: req.body.code }],
  });

  if (existingDepartment) {
    res.status(400);
    throw new Error("Department with this name or code already exists");
  }

  // Create department
  const department = await Department.create({
    ...req.body,
    createdBy: req.user._id,
  });

  // Populate the created department
  await department.populate("createdBy", "name email");

  res.status(201).json({
    success: true,
    data: department,
  });
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Manager+)
export const updateDepartment = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(
      `Validation Error: ${errors
        .array()
        .map((err) => err.msg)
        .join(", ")}`
    );
  }

  let department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  // Check if user has permission to update
  if (
    req.user.role !== "super_admin" &&
    !department.managers.includes(req.user._id) &&
    req.user.role !== "manager"
  ) {
    res.status(403);
    throw new Error("Not authorized to update this department");
  }

  // Check for duplicate name/code if being updated
  if (req.body.name || req.body.code) {
    const duplicateQuery = {
      _id: { $ne: req.params.id },
      $or: [],
    };

    if (req.body.name) duplicateQuery.$or.push({ name: req.body.name });
    if (req.body.code) duplicateQuery.$or.push({ code: req.body.code });

    if (duplicateQuery.$or.length > 0) {
      const existingDepartment = await Department.findOne(duplicateQuery);
      if (existingDepartment) {
        res.status(400);
        throw new Error("Department with this name or code already exists");
      }
    }
  }

  // Update department
  department = await Department.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      lastUpdatedBy: req.user._id,
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("managers", "name email role")
    .populate("employees", "name email role")
    .populate("createdBy", "name email")
    .populate("lastUpdatedBy", "name email");

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Super Admin only)
export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  // Check if department has active users
  const activeUsers = await User.countDocuments({
    department: department.name,
    isActive: true,
  });

  if (activeUsers > 0) {
    res.status(400);
    throw new Error(
      "Cannot delete department with active users. Please reassign users first."
    );
  }

  // Check if department has active buses
  const activeBuses = await Bus.countDocuments({
    department: department.name,
    status: { $ne: "retired" },
  });

  if (activeBuses > 0) {
    res.status(400);
    throw new Error(
      "Cannot delete department with active buses. Please reassign buses first."
    );
  }

  await Department.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Department deleted successfully",
  });
});

// @desc    Get department statistics
// @route   GET /api/departments/stats
// @access  Private (Manager+)
export const getDepartmentStats = asyncHandler(async (req, res) => {
  const stats = await Department.getDepartmentStats();

  // Get additional statistics
  const totalDepartments = await Department.countDocuments({ isActive: true });
  const lowBudgetDepartments = await Department.getLowBudgetDepartments(10);

  res.status(200).json({
    success: true,
    data: {
      totalDepartments,
      lowBudgetCount: lowBudgetDepartments.length,
      departments: stats,
      lowBudgetDepartments,
    },
  });
});

// @desc    Add user to department
// @route   POST /api/departments/:id/users
// @access  Private (Manager+)
export const addUserToDepartment = asyncHandler(async (req, res) => {
  const { userId, role = "employee" } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if user is already in department
  const isManager = department.managers.includes(userId);
  const isEmployee = department.employees.includes(userId);

  if (isManager || isEmployee) {
    res.status(400);
    throw new Error("User is already assigned to this department");
  }

  // Add user to department
  await department.addUser(userId, role);

  // Update user's department
  user.department = department.name;
  await user.save();

  // Populate and return updated department
  const updatedDepartment = await Department.findById(req.params.id)
    .populate("managers", "name email role")
    .populate("employees", "name email role");

  res.status(200).json({
    success: true,
    message: `User added to department as ${role}`,
    data: updatedDepartment,
  });
});

// @desc    Remove user from department
// @route   DELETE /api/departments/:id/users/:userId
// @access  Private (Manager+)
export const removeUserFromDepartment = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Remove user from department
  await department.removeUser(userId);

  // Update user's department to null
  user.department = null;
  await user.save();

  // Populate and return updated department
  const updatedDepartment = await Department.findById(req.params.id)
    .populate("managers", "name email role")
    .populate("employees", "name email role");

  res.status(200).json({
    success: true,
    message: "User removed from department",
    data: updatedDepartment,
  });
});

// @desc    Add asset to department
// @route   POST /api/departments/:id/assets
// @access  Private (Manager+)
export const addAssetToDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.addAsset(req.body);

  res.status(200).json({
    success: true,
    message: "Asset added to department",
    data: department,
  });
});

// @desc    Update department asset
// @route   PUT /api/departments/:id/assets/:assetId
// @access  Private (Manager+)
export const updateDepartmentAsset = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.updateAsset(req.params.assetId, req.body);

  res.status(200).json({
    success: true,
    message: "Asset updated successfully",
    data: department,
  });
});

// @desc    Remove asset from department
// @route   DELETE /api/departments/:id/assets/:assetId
// @access  Private (Manager+)
export const removeAssetFromDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.removeAsset(req.params.assetId);

  res.status(200).json({
    success: true,
    message: "Asset removed from department",
    data: department,
  });
});

// @desc    Add goal to department
// @route   POST /api/departments/:id/goals
// @access  Private (Manager+)
export const addGoalToDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.addGoal(req.body);

  res.status(200).json({
    success: true,
    message: "Goal added to department",
    data: department,
  });
});

// @desc    Update department goal
// @route   PUT /api/departments/:id/goals/:goalId
// @access  Private (Manager+)
export const updateDepartmentGoal = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.updateGoal(req.params.goalId, req.body);

  res.status(200).json({
    success: true,
    message: "Goal updated successfully",
    data: department,
  });
});

// @desc    Update department budget
// @route   PUT /api/departments/:id/budget
// @access  Private (Manager+)
export const updateDepartmentBudget = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await department.updateBudget(req.body);

  res.status(200).json({
    success: true,
    message: "Budget updated successfully",
    data: department,
  });
});
