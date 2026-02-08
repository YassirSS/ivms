import { p } from "../helpers.js";

const domain = "bus_maintenance.status";

export const BUS_MAINTENANCE_STATUS_PERMISSIONS = {
  BUS_MAINTENANCE_STATUS_HOLD: p(domain, "hold"),
  BUS_MAINTENANCE_STATUS_ACTIVE: p(domain, "active"),
  BUS_MAINTENANCE_STATUS_SOLVED: p(domain, "solved"),
  BUS_MAINTENANCE_STATUS_CLOSED: p(domain, "closed"),
};
