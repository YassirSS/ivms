import { p } from "../helpers.js";

const domain = "bus_maintenance";

export const BUS_MAINTENANCE_PERMISSIONS = {
  BUS_MAINTENANCE_VIEW: p(domain, "view"),
  BUS_MAINTENANCE_REQUEST: p(domain, "request"),
  BUS_MAINTENANCE_CREATE: p(domain, "create"),
  BUS_MAINTENANCE_UPDATE: p(domain, "update"),
  BUS_MAINTENANCE_DELETE: p(domain, "delete"),
};
