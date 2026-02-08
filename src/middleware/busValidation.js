import { body, param, query } from "express-validator";
import { DEPARTMENTS, BUS_FEATURES } from "../constants/enums.js";

// Validation for creating a new bus
export const validateCreateBus = [
  body("fleetNumber")
    .notEmpty()
    .withMessage("Fleet number is required")
    .isLength({ max: 18 })
    .withMessage("Fleet number cannot be more than 18 characters")
    .matches(/^\d+$/)
    .withMessage("Fleet number must contain digits only"),

  body("plateLetters")
    .notEmpty()
    .withMessage("Plate letters are required")
    .isLength({ min: 3, max: 3 })
    .withMessage("Plate letters must be exactly 3 characters")
    .matches(/^[A-Za-z]{3}$/)
    .withMessage("Plate letters must contain only English letters (A–Z)"),

  // 🔹 Plate digits: exactly 4 numeric digits
  body("plateDigits")
    .notEmpty()
    .withMessage("Plate digits are required")
    .isLength({ min: 4, max: 4 })
    .withMessage("Plate digits must be exactly 4 numbers")
    .matches(/^\d{4}$/)
    .withMessage("Plate digits must contain only digits (0–9)"),

  // body("description")
  //   .notEmpty()
  //   .withMessage("Bus description is required")
  //   .isLength({ min: 5, max: 200 })
  //   .withMessage("Description must be between 5 and 200 characters"),

  body("passengerCapacity")
    .isInt({ min: 10, max: 100 })
    .withMessage("Passenger capacity must be between 10 and 100"),

  body("features")
    .optional()
    .isArray()
    .withMessage("Features must be an array")
    .custom((arr) => {
      // Only allow known features
      const validValues = Object.values(BUS_FEATURES);
      const allValid = arr.every((f) => validValues.includes(f));
      if (!allValid) {
        throw new Error("One or more features are invalid");
      }

      // No duplicates
      const hasDuplicates = new Set(arr).size !== arr.length;
      if (hasDuplicates) {
        throw new Error("Duplicate features are not allowed");
      }

      return true;
    }),

  body("busType")
    .notEmpty()
    .withMessage("Bus type is required")
    .isString()
    .withMessage("Bus type must be a string")
    .trim()
    .customSanitizer((v) => String(v).toUpperCase()),

  body("manufacturer")
    .notEmpty()
    .withMessage("Manufacturer is required")
    .isString()
    .withMessage("Manufacturer must be a string")
    .trim()
    .customSanitizer((v) => String(v).toUpperCase()),

  body("modelYear")
    .notEmpty()
    .withMessage("Model year is required")
    .toInt()
    .isInt({ min: 1990 })
    .withMessage("Model year must be >= 1990")
    .custom((v) => {
      const max = new Date().getFullYear() + 1;
      if (v > max) throw new Error(`Model year cannot be after ${max}`);
      return true;
    }),

  body("chassisNumber")
    .optional({ nullable: true, checkFalsy: true }) // allow missing/empty if optional
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isString()
    .withMessage("Chassis number must be a string")
    .isLength({ min: 6, max: 25 })
    .withMessage("Chassis number must be 6–25 characters")
    .matches(/^[A-HJ-NPR-Z0-9-]+$/)
    .withMessage("Only A–Z (no I,O,Q), 0–9, and hyphen are allowed"),

  body("engineNumber")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isLength({ max: 20 })
    .withMessage("Engine number cannot exceed 20 characters")
    .matches(/^[A-Z0-9-]*$/)
    .withMessage("Engine number must contain only letters, digits, or hyphens"),

  body("registrationExpiry")
    .notEmpty()
    .withMessage("Registration expiry date is required")
    .isISO8601()
    .withMessage("Registration expiry date must be a valid date (YYYY-MM-DD)")
    .toDate() // convert string to Date object
    .custom((value) => {
      const minDate = new Date("2000-01-01");
      if (value <= minDate) {
        throw new Error("Registration expiry date must be after 2000-01-01");
      }
      return true;
    }),

  body("insuranceExpiry")
    .notEmpty()
    .withMessage("Insurance date is required")
    .isISO8601()
    .withMessage("Insurance date must be a valid date (YYYY-MM-DD)")
    .toDate()
    .custom((value) => {
      const minDate = new Date("2000-01-01");
      if (value <= minDate) {
        throw new Error("Insurance date must be after 2000-01-01");
      }
      return true;
    }),

  body("driver").optional().isMongoId().withMessage("Invalid driver ID"),

  body("department")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department"),
];

// Validation for updating a bus
export const validateUpdateBus = [
  param("id").isMongoId().withMessage("Invalid bus ID"),

  body("fleetNumber")
    .notEmpty()
    .withMessage("Fleet number is required")
    .isLength({ max: 18 })
    .withMessage("Fleet number cannot be more than 18 characters")
    .matches(/^\d+$/)
    .withMessage("Fleet number must contain digits only"),

  body("plateLetters")
    .notEmpty()
    .withMessage("Plate letters are required")
    .isLength({ min: 3, max: 3 })
    .withMessage("Plate letters must be exactly 3 characters")
    .matches(/^[A-Za-z]{3}$/)
    .withMessage("Plate letters must contain only English letters (A–Z)"),

  // 🔹 Plate digits: exactly 4 numeric digits
  body("plateDigits")
    .notEmpty()
    .withMessage("Plate digits are required")
    .isLength({ min: 4, max: 4 })
    .withMessage("Plate digits must be exactly 4 numbers")
    .matches(/^\d{4}$/)
    .withMessage("Plate digits must contain only digits (0–9)"),

  // body("description")
  //   .optional()
  //   .isLength({ min: 5, max: 200 })
  //   .withMessage("Description must be between 5 and 200 characters"),

  body("chassisNumber")
    .optional({ nullable: true, checkFalsy: true }) // allow missing/empty if optional
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isString()
    .withMessage("Chassis number must be a string")
    .isLength({ min: 6, max: 25 })
    .withMessage("Chassis number must be 6–25 characters")
    .matches(/^[A-HJ-NPR-Z0-9-]+$/)
    .withMessage("Only A–Z (no I,O,Q), 0–9, and hyphen are allowed"),

  body("engineNumber")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isLength({ max: 20 })
    .withMessage("Engine number cannot exceed 20 characters")
    .matches(/^[A-Z0-9-]*$/)
    .withMessage("Engine number must contain only letters, digits, or hyphens"),

  body("registrationExpiry")
    .notEmpty()
    .withMessage("Registration expiry date is required")
    .isISO8601()
    .withMessage("Registration expiry date must be a valid date (YYYY-MM-DD)")
    .toDate() // convert string to Date object
    .custom((value) => {
      const minDate = new Date("2000-01-01");
      if (value <= minDate) {
        throw new Error("Registration expiry date must be after 2000-01-01");
      }
      return true;
    }),

  body("insuranceExpiry")
    .notEmpty()
    .withMessage("Insurance date is required")
    .isISO8601()
    .withMessage("Insurance date must be a valid date (YYYY-MM-DD)")
    .toDate()
    .custom((value) => {
      const minDate = new Date("2000-01-01");
      if (value <= minDate) {
        throw new Error("Insurance date must be after 2000-01-01");
      }
      return true;
    }),

  body("passengerCapacity")
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage("Passenger capacity must be between 10 and 100"),

  body("driver").optional().isMongoId().withMessage("Invalid driver ID"),
];

// Validation for assigning driver to bus
export const validateAssignDriver = [
  param("id").isMongoId().withMessage("Invalid bus ID"),

  body("driverId")
    .notEmpty()
    .withMessage("Driver ID is required")
    .isMongoId()
    .withMessage("Invalid driver ID"),
];

// Validation for bus ID parameter
export const validateBusId = [
  param("id").isMongoId().withMessage("Invalid bus ID"),
];

// Validation for bus query parameters
export const validateBusQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("department")
    .optional()
    .isIn(Object.values(DEPARTMENTS))
    .withMessage("Invalid department filter"),

  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),

  query("sortBy")
    .optional()
    .isIn([
      "plateNumber",
      "description",
      "passengerCapacity",
      "createdAt",
      "updatedAt",
    ])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("includeInactive")
    .optional()
    .isBoolean()
    .withMessage("Include inactive must be a boolean"),
];
