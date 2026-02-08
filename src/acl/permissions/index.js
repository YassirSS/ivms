import { SYSTEM_PERMISSIONS } from "./system/system.permissions.js";
import { USER_PERMISSIONS } from "./user_management.permissions.js";
import { BUS_PERMISSIONS } from "./bus.permissions.js";
import { BUS_MAINTENANCE } from "./bus_maintenance.permissions.js";
import { BUS_MAINTENANCE_STATUS_PERMISSIONS } from "./bus_maintenance_status.permissions.js";
import { FUEL_PERMISSIONS } from "./fuel.permissions.js";
import { DIBURSEMENT_PERMISSIONS } from "./disbursement.permissions.js";
import { INSPECTION_PERMISSIONS } from "./inspection.permissions.js";
import { INSURANCE_PERMISSIONS } from "./insurance.permissions.js";
import { IVMS_MAINTENANCE_PERMISSIONS } from "./ivms_maintenance.permissions.js";
import { IVMS_MAINTENANCE_STATUS_PERMISSIONS } from "./ivms_maintenance_status.permissions.js";
import { LOCATION_PERMISSIONS } from "./location.permissions.js";
import { OPERATION_EXIT_PERMIT_PERMISSIONS } from "./operation_exit_permit.permissions.js";
import { DEPARTMENT_PERMISSIONS } from "./department.permissions.js";

export const PERMISSIONS = {
  ...SYSTEM_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...BUS_PERMISSIONS,
  ...BUS_MAINTENANCE,
  ...BUS_MAINTENANCE_STATUS_PERMISSIONS,
  ...FUEL_PERMISSIONS,
  ...DIBURSEMENT_PERMISSIONS,
  ...INSPECTION_PERMISSIONS,
  ...INSURANCE_PERMISSIONS,
  ...IVMS_MAINTENANCE_PERMISSIONS,
  ...IVMS_MAINTENANCE_STATUS_PERMISSIONS,
  ...LOCATION_PERMISSIONS,
  ...OPERATION_EXIT_PERMIT_PERMISSIONS,
  ...DEPARTMENT_PERMISSIONS,
};
