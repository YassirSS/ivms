import { p } from "../helpers.js";

const domain = "bus";

export const BUS_PERMISSIONS = {
  BUS_VIEW: p(domain, "view"),
  BUS_CREATE: p(domain, "create"),
  BUS_UPDATE: p(domain, "update"),
  BUS_DELETE: p(domain, "delete"),

  // Added to support assign/unassign/reassign driver operations
  ASSIGN_DRIVER: p(domain, "assign_driver"),
};

export const ALL_BUS_PERMISSIONS = Object.values(BUS_PERMISSIONS);
