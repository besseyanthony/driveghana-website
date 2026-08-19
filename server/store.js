// Tiny persistence layer for the DriveGhana API.
//
// Bookings and subscribers live in memory. Pass `persistPath` to mirror them to a
// JSON file so a restarted dev server keeps its data; tests leave it off to get a
// clean, isolated store per run.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { addDays, parseISODate } from "../shared/dates.js";
import { quote } from "../shared/pricing.js";
import { SERVED_LOCATIONS, VEHICLES } from "./data/vehicles.js";

/**
 * Do two rental ranges collide? Ranges are half-open so a car returned on the 22nd
 * can be collected again on the 22nd. A same-day rental still blocks one full day.
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const endOf = (start, end) => (end.getTime() > start.getTime() ? end : addDays(start, 1));
  return aStart < endOf(bStart, bEnd) && bStart < endOf(aStart, aEnd);
}

function newReference() {
  return `DG-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

export function createStore({ persistPath } = {}) {
  let state = { bookings: [], subscribers: [] };

  if (persistPath && existsSync(persistPath)) {
    try {
      const parsed = JSON.parse(readFileSync(persistPath, "utf8"));
      state = {
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
        subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      };
    } catch {
      // A corrupt dev database should never stop the server from booting.
      console.warn(`[store] ignoring unreadable database at ${persistPath}`);
    }
  }

  function persist() {
    if (!persistPath) return;
    mkdirSync(dirname(persistPath), { recursive: true });
    writeFileSync(persistPath, `${JSON.stringify(state, null, 2)}\n`);
  }

  return {
    servedLocations: () => [...SERVED_LOCATIONS],

    listVehicles: ({ category } = {}) =>
      VEHICLES.filter((vehicle) => !category || vehicle.category === category).map((v) => ({
        ...v,
      })),

    findVehicle: (id) => VEHICLES.find((vehicle) => vehicle.id === id) ?? null,

    /** Is a location one we serve? Case-insensitive. */
    servesLocation(location) {
      const needle = String(location).trim().toLowerCase();
      return SERVED_LOCATIONS.some((city) => city.toLowerCase() === needle);
    },

    /** Bookings that would clash with the requested vehicle and date range. */
    conflictingBookings({ vehicleId, pickupDate, returnDate }) {
      const from = parseISODate(pickupDate);
      const to = parseISODate(returnDate);
      if (!from || !to) return [];

      return state.bookings.filter((booking) => {
        if (booking.vehicleId !== vehicleId) return false;
        if (booking.status === "cancelled") return false;
        return rangesOverlap(
          from,
          to,
          parseISODate(booking.pickupDate),
          parseISODate(booking.returnDate),
        );
      });
    },

    /**
     * Vehicles that are free for the given range, each with a full price quote.
     * Filters by pick-up city and, optionally, category.
     */
    searchAvailability({ pickupLocation, pickupDate, returnDate, category }) {
      const city = String(pickupLocation).trim().toLowerCase();

      return VEHICLES.filter((vehicle) => {
        if (category && vehicle.category !== category) return false;
        if (!vehicle.locations.some((loc) => loc.toLowerCase() === city)) return false;
        return this.conflictingBookings({ vehicleId: vehicle.id, pickupDate, returnDate })
          .length === 0;
      }).map((vehicle) => ({
        ...vehicle,
        quote: quote(vehicle.pricePerDay, pickupDate, returnDate),
      }));
    },

    createBooking(details) {
      const vehicle = this.findVehicle(details.vehicleId);
      const booking = {
        reference: newReference(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        pickupLocation: details.pickupLocation,
        pickupDate: details.pickupDate,
        returnDate: details.returnDate,
        customerName: details.customerName,
        customerEmail: details.customerEmail,
        quote: quote(vehicle.pricePerDay, details.pickupDate, details.returnDate),
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };

      state.bookings.push(booking);
      persist();
      return { ...booking };
    },

    listBookings: () => state.bookings.map((booking) => ({ ...booking })),

    findBooking: (reference) => {
      const match = state.bookings.find(
        (booking) => booking.reference.toLowerCase() === String(reference).toLowerCase(),
      );
      return match ? { ...match } : null;
    },

    /** Idempotent: subscribing twice reports `created: false` rather than erroring. */
    addSubscriber(email) {
      const existing = state.subscribers.find((sub) => sub.email === email);
      if (existing) return { created: false, subscriber: { ...existing } };

      const subscriber = { email, subscribedAt: new Date().toISOString() };
      state.subscribers.push(subscriber);
      persist();
      return { created: true, subscriber: { ...subscriber } };
    },

    listSubscribers: () => state.subscribers.map((sub) => ({ ...sub })),
  };
}
