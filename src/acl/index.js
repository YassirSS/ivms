import { PERMISSIONS } from "./permissions/index.js";
import { ROLE_BUNDLES, JOB_TITLE_BUNDLES } from "./bundles/index.js";

export { PERMISSIONS, ROLE_BUNDLES, JOB_TITLE_BUNDLES };

export function computeUserPermissions(user) {
  const roleKey = String(user.role || "").toUpperCase();
  const fromRole = ROLE_BUNDLES[roleKey] || [];
  const fromJobTitle = JOB_TITLE_BUNDLES[user.jobTitle] || [];
  const fromUser = Array.isArray(user.permissions) ? user.permissions : [];
  const set = new Set([...fromRole, ...fromJobTitle, ...fromUser]);
  return Array.from(set);
}
