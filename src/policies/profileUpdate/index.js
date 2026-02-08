// src/policies/profileUpdate/index.js
import { buildAllowedPatch } from "./engine.js";
import basicRule from "./rules/basic.js";
import contactRule from "./rules/contact.js";
import addressRule from "./rules/address.js";

export function buildAllowedProfileUpdates({ payload, perms, PERMISSIONS }) {
  return buildAllowedPatch({
    payload,
    perms,
    PERMISSIONS,
    rules: [basicRule, contactRule, addressRule],
  });
}

export { buildAllowedPatch };
