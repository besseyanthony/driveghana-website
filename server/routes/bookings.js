import { Router } from "express";

import { validateBooking } from "../../shared/validation.js";

/**
 * Reservation endpoints.
 * @param {ReturnType<import("../store.js").createStore>} store
 */
export function bookingsRouter(store) {
  const router = Router();

  router.get("/bookings", (req, res) => {
    res.json({ bookings: store.listBookings() });
  });

  router.get("/bookings/:reference", (req, res) => {
    const booking = store.findBooking(req.params.reference);
    if (!booking) {
      return res.status(404).json({ error: { message: "Booking reference not found." } });
    }
    res.json({ booking });
  });

  router.post("/bookings", (req, res) => {
    const { valid, errors, value } = validateBooking(req.body);
    if (!valid) {
      return res.status(400).json({
        error: { message: "Check your booking details.", fields: errors },
      });
    }

    const vehicle = store.findVehicle(value.vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        error: {
          message: "That vehicle is no longer in our fleet.",
          fields: { vehicleId: "Unknown vehicle." },
        },
      });
    }

    if (!store.servesLocation(value.pickupLocation)) {
      return res.status(400).json({
        error: {
          message: `We do not hand over cars in ${value.pickupLocation} yet.`,
          fields: {
            pickupLocation: `Choose one of: ${store.servedLocations().join(", ")}.`,
          },
        },
      });
    }

    if (!vehicle.locations.some((loc) => loc.toLowerCase() === value.pickupLocation.toLowerCase())) {
      return res.status(409).json({
        error: {
          message: `The ${vehicle.name} is not stationed in ${value.pickupLocation}.`,
          fields: { pickupLocation: `Available in: ${vehicle.locations.join(", ")}.` },
        },
      });
    }

    const conflicts = store.conflictingBookings(value);
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: {
          message: `The ${vehicle.name} is already booked for those dates.`,
          fields: { returnDate: "Try a different date range or another vehicle." },
        },
      });
    }

    const booking = store.createBooking(value);
    res.status(201).json({ booking });
  });

  return router;
}
