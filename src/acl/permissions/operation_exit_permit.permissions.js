import { p } from "../helpers.js";

const domain = "operation_exit_permit";

export const OPERATION_EXIT_PERMIT_PERMISSIONS = {
  OPERATION_EXIT_PERMIT_VIEW: p(domain, "view"),
  OPERATION_EXIT_PERMIT_CREATE: p(domain, "create"),
  OPERATION_EXIT_PERMIT_UPDATE: p(domain, "update"),
  OPERATION_EXIT_PERMIT_DELETE: p(domain, "delete"),
};
