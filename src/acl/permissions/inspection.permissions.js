import { p } from "../helpers.js";

const domain = "inspection";

export const INSPECTION_PERMISSIONS = {
  INSPECTION_VIEW: p(domain, "view"),
  INSPECTION_CREATE: p(domain, "create"),
  INSPECTION_UPDATE: p(domain, "update"),
  INSPECTION_CLOSE: p(domain, "close"),
};
