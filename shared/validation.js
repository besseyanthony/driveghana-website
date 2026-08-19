// Request validation shared by the browser bundle and the Node server. The server
// is the source of truth; the browser reuses these rules to fail fast before a
// pointless round trip.

import { parseISODate, rentalDays, startOfToday } from "./dates.js";

/** Deliberately permissive: catches typos without rejecting valid odd addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_RENTAL_DAYS = 90;
export const VEHICLE_CATEGORIES = ["sedan", "suv", "minivan", "pickup", "luxury"];

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL.test(value.trim());
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate the pick-up location and date range used by both search and booking.
 * Mutates neither argument; returns collected field errors plus normalised values.
 */
function validateRental(payload, { today = startOfToday() } = {}) {
  const errors = {};
  const value = {};

  const location = text(payload?.pickupLocation);
  if (location.length < 2) {
    errors.pickupLocation = "Tell us where you want to pick the car up.";
  } else {
    value.pickupLocation = location;
  }

  const pickup = parseISODate(text(payload?.pickupDate));
  const dropoff = parseISODate(text(payload?.returnDate));

  if (!pickup) {
    errors.pickupDate = "Choose a pick-up date in YYYY-MM-DD format.";
  } else if (pickup.getTime() < today.getTime()) {
    errors.pickupDate = "Pick-up date cannot be in the past.";
  } else {
    value.pickupDate = text(payload.pickupDate);
  }

  if (!dropoff) {
    errors.returnDate = "Choose a return date in YYYY-MM-DD format.";
  } else if (pickup && dropoff.getTime() < pickup.getTime()) {
    errors.returnDate = "Return date must be on or after the pick-up date.";
  } else if (pickup && rentalDays(pickup, dropoff) > MAX_RENTAL_DAYS) {
    errors.returnDate = `Rentals are capped at ${MAX_RENTAL_DAYS} days — contact us for long-term leases.`;
  } else {
    value.returnDate = text(payload.returnDate);
  }

  const category = text(payload?.category).toLowerCase();
  if (category) {
    if (!VEHICLE_CATEGORIES.includes(category)) {
      errors.category = `Unknown category. Choose one of: ${VEHICLE_CATEGORIES.join(", ")}.`;
    } else {
      value.category = category;
    }
  }

  return { errors, value };
}

/** Validate a fleet availability search. */
export function validateSearch(payload, options = {}) {
  const { errors, value } = validateRental(payload, options);
  return { valid: Object.keys(errors).length === 0, errors, value };
}

/** Validate a reservation request, which additionally needs the customer's details. */
export function validateBooking(payload, options = {}) {
  const { errors, value } = validateRental(payload, options);

  const vehicleId = text(payload?.vehicleId);
  if (!vehicleId) {
    errors.vehicleId = "Choose a vehicle to reserve.";
  } else {
    value.vehicleId = vehicleId;
  }

  const customerName = text(payload?.customerName);
  if (customerName.length < 2) {
    errors.customerName = "Enter the driver's full name.";
  } else {
    value.customerName = customerName;
  }

  const customerEmail = text(payload?.customerEmail);
  if (!isValidEmail(customerEmail)) {
    errors.customerEmail = "Enter a valid email address so we can send the voucher.";
  } else {
    value.customerEmail = customerEmail.toLowerCase();
  }

  return { valid: Object.keys(errors).length === 0, errors, value };
}

/** Validate a newsletter subscription. */
export function validateSubscription(payload) {
  const errors = {};
  const email = text(payload?.email);
  if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { email: email.toLowerCase() },
  };
}
