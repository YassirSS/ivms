export const UNIQUE_FIELDS = ["fleetNumber", "engineNumber", "chassisNumber"];

const normLetters = (v) =>
  String(v || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
const normDigits = (v) =>
  String(v || "")
    .replace(/\D/g, "")
    .padStart(4, "0");

export function buildDuplicateFilters(body, existingBus = null) {
  const orFilters = [];

  const lettersProvided = Object.prototype.hasOwnProperty.call(
    body,
    "plateLetters"
  );
  const digitsProvided = Object.prototype.hasOwnProperty.call(
    body,
    "plateDigits"
  );

  if (lettersProvided || digitsProvided) {
    const letters = lettersProvided
      ? normLetters(body.plateLetters)
      : existingBus?.plateLetters;
    const digits = digitsProvided
      ? normDigits(body.plateDigits)
      : existingBus?.plateDigits;

    if (letters && digits) {
      const newCombinedPlate = `${letters}${digits}`;
      orFilters.push({ plateNumber: newCombinedPlate });
      return { orFilters, newCombinedPlate };
    }
    return { orFilters, newCombinedPlate: null };
  }

  return { orFilters, newCombinedPlate: null };
}
