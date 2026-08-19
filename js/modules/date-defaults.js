import { addDays, startOfToday, toISODate } from "../../shared/dates.js";

/** Nights pre-filled into the hero search bar on first load. */
export const DEFAULT_TRIP_LENGTH = 3;

/**
 * Pre-fill the search bar with today and today + `days`, and stop the visitor
 * choosing a pick-up date in the past.
 *
 * @returns {{pickupDate: string, returnDate: string}} the applied values.
 */
export function applyDefaultDates({
  pickupInput,
  returnInput,
  days = DEFAULT_TRIP_LENGTH,
  now = new Date(),
} = {}) {
  const today = startOfToday(now);
  const pickupDate = toISODate(today);
  const returnDate = toISODate(addDays(today, days));

  if (pickupInput) {
    pickupInput.value = pickupDate;
    pickupInput.min = pickupDate;
  }
  if (returnInput) {
    returnInput.value = returnDate;
    returnInput.min = pickupDate;
  }

  // Keep the return date honest whenever the pick-up date moves.
  pickupInput?.addEventListener("change", () => {
    if (!returnInput || !pickupInput.value) return;
    returnInput.min = pickupInput.value;
    if (returnInput.value && returnInput.value < pickupInput.value) {
      returnInput.value = pickupInput.value;
    }
  });

  return { pickupDate, returnDate };
}
