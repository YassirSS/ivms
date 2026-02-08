import { p } from "../helpers.js";

const domain = "insurance";

export const INSURANCE_PERMISSIONS = {
  INSURANCE_VIEW: p(domain, "view"),
  INSURANCE_CREATE: p(domain, "create"),
  INSURANCE_UPDATE: p(domain, "update"),
  INSURANCE_CLOSE: p(domain, "close"),
};
