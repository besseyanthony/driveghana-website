// Quote maths shared by the browser bundle and the Node server so the estimate a
// visitor sees always matches the total the API stores.

import { rentalDays } from "./dates.js";

/** Service fee charged on top of the daily rate, as a fraction of the subtotal. */
export const SERVICE_FEE_RATE = 0.05;

/** Discount applied to rentals long enough to count as a weekly hire. */
export const WEEKLY_DISCOUNT_RATE = 0.1;
export const WEEKLY_DISCOUNT_MIN_DAYS = 7;

/** Round to whole currency units — DriveGhana quotes in whole cedis. */
function round(amount) {
  return Math.round(amount);
}

/**
 * Build a full price breakdown for a rental.
 * @param {number} pricePerDay
 * @param {string|Date} pickupDate
 * @param {string|Date} returnDate
 * @returns {{days:number, pricePerDay:number, subtotal:number, discount:number, serviceFee:number, total:number, currency:string}}
 */
export function quote(pricePerDay, pickupDate, returnDate) {
  const days = rentalDays(pickupDate, returnDate);
  const subtotal = round(pricePerDay * days);
  const discount =
    days >= WEEKLY_DISCOUNT_MIN_DAYS ? round(subtotal * WEEKLY_DISCOUNT_RATE) : 0;
  const serviceFee = round((subtotal - discount) * SERVICE_FEE_RATE);

  return {
    days,
    pricePerDay,
    subtotal,
    discount,
    serviceFee,
    total: subtotal - discount + serviceFee,
    currency: "GHS",
  };
}

/** Format a whole-cedi amount for display, e.g. `₵1,400`. */
export function formatCedis(amount) {
  return `₵${Math.round(amount).toLocaleString("en-US")}`;
}
