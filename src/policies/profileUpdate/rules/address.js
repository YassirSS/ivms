// src/policies/profileUpdate/rules/address.js
export default function addressRule(ctx) {
  const { payload, permSet, PERMISSIONS } = ctx;
  const out = {};

  // Address fields
  if (payload.address) {
    const addrOut = {};
    if (
      payload.address.street &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_ADDRESS_STREET)
    ) {
      addrOut.street = payload.address.street;
    }
    if (
      payload.address.city &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_ADDRESS_CITY)
    ) {
      addrOut.city = payload.address.city;
    }
    if (
      payload.address.state &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_ADDRESS_STATE)
    ) {
      addrOut.state = payload.address.state;
    }
    if (
      payload.address.zip &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_ADDRESS_ZIP)
    ) {
      addrOut.zip = payload.address.zip;
    }
    if (
      payload.address.country &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_ADDRESS_COUNTRY)
    ) {
      addrOut.country = payload.address.country;
    }

    if (Object.keys(addrOut).length) {
      out.address = addrOut;
    }
  }

  // Driver/Employee/Contractor address subdocs
  if (payload.driverProfile?.address) {
    const dp = {};
    if (
      payload.driverProfile.address.depotCode &&
      permSet.has(PERMISSIONS.DRIVER_PROFILE_UPDATE_ADDRESS_DEPOTCODE)
    ) {
      dp.address = { depotCode: payload.driverProfile.address.depotCode };
    }
    if (Object.keys(dp).length) out.driverProfile = dp;
  }

  if (payload.employeeProfile?.address) {
    const ep = {};
    if (
      payload.employeeProfile.address.officeCode &&
      permSet.has(PERMISSIONS.EMPLOYEE_PROFILE_UPDATE_ADDRESS_OFFICECODE)
    ) {
      ep.address = { officeCode: payload.employeeProfile.address.officeCode };
    }
    if (Object.keys(ep).length) out.employeeProfile = ep;
  }

  if (payload.contractorProfile?.address) {
    const cp = {};
    if (
      payload.contractorProfile.address.hqCode &&
      permSet.has(PERMISSIONS.CONTRACTOR_PROFILE_UPDATE_ADDRESS_HQCODE)
    ) {
      cp.address = { hqCode: payload.contractorProfile.address.hqCode };
    }
    if (Object.keys(cp).length) out.contractorProfile = cp;
  }

  return out;
}
