import express from "express";
import { protect, authorizePermissions } from "../middleware/auth.js";
import {
  getJobTitleBundles,
  getAllPermissions,
  getRoleBundles,
  getJobTitles,
  computeEffectivePermissions,
  getPermissionsGrouped,
} from "../controllers/aclController.js";

const router = express.Router();

// Authenticate all routes in this router
router.use(protect);

// Anyone authenticated can read bundles to render UI; tighten later if needed
router.get("/job-title-bundles", getJobTitleBundles);
router.get("/job-titles", getJobTitles);
router.get("/permissions", getAllPermissions);
router.get("/permissions-grouped", getPermissionsGrouped);
router.post("/compute", computeEffectivePermissions);
// Optional: expose role bundles (identity only)
router.get(
  "/role-bundles",
  authorizePermissions(PERMISSIONS.ROLE_VIEW),
  getRoleBundles
);

export default router;
