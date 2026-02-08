import { p } from "../helpers.js";

const domain = "ivms_maintenance.status";

export const IVMS_MAINTENANCE_STATUS_PERMISSIONS = {
  IVMS_MAINTENANCE_STATUS_HOLD: p(domain, "hold"),
  IVMS_MAINTENANCE_STATUS_ACTIVE: p(domain, "active"),
  IVMS_MAINTENANCE_STATUS_SOLVED: p(domain, "solved"),
  IVMS_MAINTENANCE_STATUS_CLOSED: p(domain, "closed"),
};
