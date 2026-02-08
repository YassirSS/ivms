// src/constants/permissions.js
export const PERMISSIONS = {
  // Buses
  BUS_READ: "bus.read",
  BUS_CREATE: "bus.create",
  BUS_UPDATE: "bus.update",
  BUS_DELETE: "bus.delete",
  BUS_ASSIGN_DRIVER: "bus.assignDriver",

  // Users
  USER_READ: "user.read",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",

  // Departments
  DEPT_READ: "department.read",
  DEPT_UPDATE: "department.update",
};

export const ROLE_PERMISSIONS = {
  super_admin: [...Object.values(PERMISSIONS)],
  admin: [
    PERMISSIONS.BUS_READ,
    PERMISSIONS.BUS_CREATE,
    PERMISSIONS.BUS_UPDATE,
    PERMISSIONS.BUS_DELETE,
    PERMISSIONS.BUS_ASSIGN_DRIVER,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.DEPT_READ,
    PERMISSIONS.DEPT_UPDATE,
  ],
  manager: [
    PERMISSIONS.BUS_READ,
    PERMISSIONS.BUS_CREATE,
    PERMISSIONS.BUS_UPDATE,
    PERMISSIONS.BUS_ASSIGN_DRIVER,
    PERMISSIONS.USER_READ,
    PERMISSIONS.DEPT_READ,
    PERMISSIONS.DEPT_UPDATE,
  ],
  driver: [PERMISSIONS.BUS_READ],
  user: [PERMISSIONS.BUS_READ],
};
