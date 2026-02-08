import { p } from "../helpers.js";

const domain = "location";

export const LOCATION_PERMISSIONS = {
  LOCATION_VIEW: p(domain, "view"),
  LOCATION_CREATE: p(domain, "create"),
  LOCATION_UPDATE: p(domain, "update"),
  LOCATION_DELETE: p(domain, "delete"),
};
