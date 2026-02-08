import { p } from "../helpers.js";

const domain = "user";

export const USER_PERMISSIONS = {
  // Core user actions
  USER_VIEW: p(domain, "view"),
  USER_CREATE: p(domain, "create"),
  USER_UPDATE: p(domain, "update"),
  USER_DELETE: p(domain, "delete"),
  USER_LIST: p(domain, "list"),

  // Profile granularity
  USER_UPDATE_PROFILE: p(domain, "update_profile"),
  USER_UPDATE_ANY: p(domain, "update_any"),

  // Department movement
  USER_MOVE_DEPARTMENT: p(domain, "move_department"),

  // Role management (authority-level)
  USER_ROLE_UPDATE: p(domain, "role_update"),
  USER_ROLE_ADMIN_MANAGE: p(domain, "role_admin_manage"),

  // Permission overrides assignment
  USER_ASSIGN_PERMISSIONS: p(domain, "assign_permissions"),

  // Activation lifecycle
  USER_DEACTIVATE: p(domain, "deactivate"),
  USER_DEACTIVATE_ADMIN: p(domain, "deactivate_admin"),
  USER_REACTIVATE: p(domain, "reactivate"),

  // Stats viewing
  USER_STATS_VIEW: p(domain, "stats_view"),

  // Elevation permissions (legacy, still usable)
  USER_ELEVATE_MANAGER: p(domain, "elevate_manager"),
  USER_ELEVATE_ADMIN: p(domain, "elevate_admin"),

  // Self profile edit granularity
  PROFILE_EDIT_SELF_BASIC: p("profile", "edit_self_basic"), // avatar, password, maybe email
  PROFILE_EDIT_SELF_CONTACT: p("profile", "edit_self_contact"), // phone, emergencyContact
  PROFILE_EDIT_SELF_SENSITIVE: p("profile", "edit_self_sensitive"), // name, national ids

  // Cross-domain override approval
  OVERRIDE_APPROVE: "override:approve",

  // Driver listing scope
  DRIVER_LIST: p("driver", "list"),
};

export const ALL_USER_PERMISSIONS = Object.values(USER_PERMISSIONS);
