import { p } from "../helpers.js";

const domain = "department";

export const DEPARTMENT_PERMISSIONS = {
  DEPARTMENT_VIEW: p(domain, "view"),
  DEPARTMENT_CREATE: p(domain, "create"),
  DEPARTMENT_UPDATE: p(domain, "update"),
  DEPARTMENT_DELETE: p(domain, "delete"),
  DEPARTMENT_STATS_VIEW: p(domain, "stats_view"),
  DEPARTMENT_USER_MANAGE: p(domain, "user.manage"),
  DEPARTMENT_ASSET_MANAGE: p(domain, "asset.manage"),
  DEPARTMENT_GOAL_MANAGE: p(domain, "goal.manage"),
  DEPARTMENT_BUDGET_MANAGE: p(domain, "budget.manage"),
};
