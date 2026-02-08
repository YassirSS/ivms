// src/policies/profileUpdate/rules/basic.js
export default function basicRule(ctx) {
  const { payload, permSet, PERMISSIONS } = ctx;
  const out = {};

  // Name
  if (payload.name && permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_NAME)) {
    out.name = payload.name;
  }

  // Email
  if (payload.email && permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_EMAIL)) {
    out.email = payload.email;
  }

  // Phone
  if (payload.phone && permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_PHONE)) {
    out.phone = payload.phone;
  }

  // User type
  if (
    typeof payload.userType !== "undefined" &&
    permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_USERTYPE)
  ) {
    out.userType = payload.userType;
  }

  // Seasonality
  if (
    typeof payload.isSeasonal !== "undefined" &&
    permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_SEASONAL)
  ) {
    out.isSeasonal = payload.isSeasonal;
  }

  // Profile subdoc placeholders if needed (no direct writes here)
  // out.driverProfile / out.employeeProfile / out.contractorProfile handled by specific rules

  return out;
}
