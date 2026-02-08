// src/utils/busDuplicateCheck.js

/**
 * Build duplicate filters for create/update flows.
 * - Computes the combined plate (letters+digits)
 * - Adds unique fields when present and non-empty
 * - Excludes the current bus (when provided)
 *
 * @param {object} body - req.body
 * @param {object|null} existingBus - Bus doc (only for update), optional
 * @returns {{ orFilters: Array<object>, newCombinedPlate: string|null }}
 */
export function buildDuplicateFilters(body = {}, existingBus = null) {
  const orFilters = [];
  let newCombinedPlate = null;

  // 1) Combined plate (letters+digits)
  const letters = (body.plateLetters ?? existingBus?.plateLetters ?? "")
    .toString()
    .trim()
    .toUpperCase();
  const digits = (body.plateDigits ?? existingBus?.plateDigits ?? "")
    .toString()
    .trim();

  if (letters && digits) {
    newCombinedPlate = `${letters}${digits.padStart(4, "0")}`;
    // For updates, we only check if it changed vs existing
    if (!existingBus || newCombinedPlate !== existingBus.plateNumber) {
      orFilters.push({ plateNumber: newCombinedPlate });
    }
  }

  // 2) Other unique fields (only if provided and non-empty)
  const UNIQUE_FIELDS = ["fleetNumber", "chassisNumber", "engineNumber"];
  for (const f of UNIQUE_FIELDS) {
    const v = body[f];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      // On update, avoid matching the same doc
      if (existingBus) {
        orFilters.push({ [f]: v, _id: { $ne: existingBus._id } });
      } else {
        orFilters.push({ [f]: v });
      }
    }
  }

  return { orFilters, newCombinedPlate };
}
