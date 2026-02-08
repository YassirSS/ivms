// src/policies/profileUpdate/rules/contact.js
export default function contactRule(ctx) {
  const { payload, permSet, PERMISSIONS } = ctx;
  const out = {};

  // General contact fields
  if (payload.contact) {
    const contactOut = {};
    if (
      payload.contact.primaryPhone &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_CONTACT_PRIMARY_PHONE)
    ) {
      contactOut.primaryPhone = payload.contact.primaryPhone;
    }
    if (
      payload.contact.secondaryPhone &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_CONTACT_SECONDARY_PHONE)
    ) {
      contactOut.secondaryPhone = payload.contact.secondaryPhone;
    }
    if (
      payload.contact.emergencyContact &&
      permSet.has(PERMISSIONS.USER_PROFILE_UPDATE_CONTACT_EMERGENCY)
    ) {
      contactOut.emergencyContact = payload.contact.emergencyContact;
    }

    if (Object.keys(contactOut).length) {
      out.contact = contactOut;
    }
  }

  // Driver profile contact fields
  if (payload.driverProfile?.contact) {
    const dp = {};
    if (
      payload.driverProfile.contact.whatsapp &&
      permSet.has(PERMISSIONS.DRIVER_PROFILE_UPDATE_WHATSAPP)
    ) {
      dp.contact = { whatsapp: payload.driverProfile.contact.whatsapp };
    }
    if (Object.keys(dp).length) out.driverProfile = dp;
  }

  // Employee profile contact fields
  if (payload.employeeProfile?.contact) {
    const ep = {};
    if (
      payload.employeeProfile.contact.workPhone &&
      permSet.has(PERMISSIONS.EMPLOYEE_PROFILE_UPDATE_WORKPHONE)
    ) {
      ep.contact = { workPhone: payload.employeeProfile.contact.workPhone };
    }
    if (Object.keys(ep).length) out.employeeProfile = ep;
  }

  // Contractor profile contact fields
  if (payload.contractorProfile?.contact) {
    const cp = {};
    if (
      payload.contractorProfile.contact.companyPhone &&
      permSet.has(PERMISSIONS.CONTRACTOR_PROFILE_UPDATE_COMPANYPHONE)
    ) {
      cp.contact = {
        companyPhone: payload.contractorProfile.contact.companyPhone,
      };
    }
    if (Object.keys(cp).length) out.contractorProfile = cp;
  }

  return out;
}
