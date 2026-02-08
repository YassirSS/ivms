import { p } from "../helpers.js";

const domain = "ivms_maintenance";

export const IVMS_MAINTENANCE_PERMISSIONS = {
  IVMS_MAINTENANCE_VIEW: p(domain, "view"),
  IVMS_MAINTENANCE_CREATE: p(domain, "create"),
  IVMS_MAINTENANCE_UPDATE: p(domain, "update"),
  IVMS_MAINTENANCE_ASSIGN: p(domain, "assign"),
  IVMS_MAINTENANCE_DELETE: p(domain, "delete"),
};
