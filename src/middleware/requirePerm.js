// backend/middleware/requirePerm.js
import { PERMISSIONS } from "../acl/index.js";

export function requirePerm(requiredPerm) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Super admin bypass only
      if (user.role === "super_admin") {
        return next();
      }

      const perms =
        typeof user.getEffectivePermissions === "function"
          ? user.getEffectivePermissions()
          : Array.isArray(user.permissions)
          ? user.permissions
          : [];

      const has = new Set(perms).has(requiredPerm);

      if (!has) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: missing permission",
          required: requiredPerm,
        });
      }
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  };
}
