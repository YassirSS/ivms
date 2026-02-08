import { PERMISSIONS, ROLE_BUNDLES, JOB_TITLE_BUNDLES } from "../acl/index.js";

// GET /api/acl/job-title-bundles
export const getJobTitleBundles = async (req, res, next) => {
  try {
    const jobTitles = Object.keys(JOB_TITLE_BUNDLES);
    const permissionValues = Object.values(PERMISSIONS);

    res.status(200).json({
      success: true,
      data: {
        jobTitles,
        bundles: JOB_TITLE_BUNDLES,
        permissions: permissionValues,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/acl/permissions
export const getAllPermissions = async (req, res, next) => {
  try {
    const permissionValues = Object.values(PERMISSIONS);
    res
      .status(200)
      .json({ success: true, data: { permissions: permissionValues } });
  } catch (error) {
    next(error);
  }
};

// (Optional) GET /api/acl/role-bundles
export const getRoleBundles = async (req, res, next) => {
  try {
    const roles = Object.keys(ROLE_BUNDLES || {});
    res
      .status(200)
      .json({ success: true, data: { roles, bundles: ROLE_BUNDLES } });
  } catch (error) {
    next(error);
  }
};

// GET /api/acl/job-titles (lightweight)
export const getJobTitles = async (req, res, next) => {
  try {
    const jobTitles = Object.keys(JOB_TITLE_BUNDLES);
    res.status(200).json({ success: true, data: { jobTitles } });
  } catch (error) {
    next(error);
  }
};

// POST /api/acl/compute
export const computeEffectivePermissions = async (req, res, next) => {
  try {
    const { jobTitle, permissions = [] } = req.body || {};

    if (
      !jobTitle ||
      !Object.prototype.hasOwnProperty.call(JOB_TITLE_BUNDLES, jobTitle)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing jobTitle",
      });
    }

    if (!Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ success: false, error: "permissions must be an array" });
    }

    const validSet = new Set(Object.values(PERMISSIONS));
    const invalid = permissions.filter((p) => !validSet.has(p));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid permission values",
        details: invalid,
      });
    }

    const base = JOB_TITLE_BUNDLES[jobTitle] || [];
    const effective = Array.from(new Set([...base, ...permissions]));

    return res.status(200).json({
      success: true,
      data: { jobTitle, base, overrides: permissions, effective },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/acl/permissions-grouped
export const getPermissionsGrouped = async (req, res, next) => {
  try {
    const all = Object.values(PERMISSIONS);
    const grouped = all.reduce((acc, perm) => {
      // domain is text before first '.'; action is after '.'
      const [domain, action = ""] = perm.split(".");
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push({ key: perm, action });
      return acc;
    }, {});

    res.status(200).json({ success: true, data: { grouped } });
  } catch (error) {
    next(error);
  }
};
