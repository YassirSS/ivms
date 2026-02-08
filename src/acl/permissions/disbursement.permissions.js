import { p } from "../helpers.js";

const domain = "disbursement";

export const DISBURSEMENT_PERMISSIONS = {
  DISBURSEMENT_VIEW: p(domain, "view"),
  DISBURSEMENT_CREATE: p(domain, "create"),
  DISBURSEMENT_UPDATE: p(domain, "update"),
  DISBURSEMENT_CLOSE: p(domain, "close"),
  DISBURSEMENT_DELETE: p(domain, "delete"),
};
