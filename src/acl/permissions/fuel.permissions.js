import { p } from "../helpers.js";

const fuel = "fuel";
const fuelConsumption = "fuel";

export const FUEL_PERMISSIONS = {
  // CRUD
  FUEL_VIEW: p(fuel, "view"),
  FUEL_CREATE: p(fuel, "create"),
  FUEL_UPDATE: p(fuel, "update"),
  FUEL_DELETE: p(fuel, "delete"),

  // consumption-specific
  FUEL_CONSUMPTION_VIEW: p(fuelConsumption, "view"),
  FUEL_CONSUMPTION_ANALYZE: p(fuelConsumption, "analyze"),
  FUEL_CONSUMPTION_REPORT: p(fuelConsumption, "report"),
  FUEL_CONSUMPTION_FLAG_SUSPICIOUS: p(fuelConsumption, "flag_suspicious"),
};
