import { Router } from "express";

import { validateSearch } from "../../shared/validation.js";

/**
 * Fleet browsing and availability search.
 * @param {ReturnType<import("../store.js").createStore>} store
 */
export function vehiclesRouter(store) {
  const router = Router();

  router.get("/locations", (req, res) => {
    res.json({ locations: store.servedLocations() });
  });

  router.get("/vehicles", (req, res) => {
    const category = String(req.query.category ?? "").trim().toLowerCase();
    res.json({ vehicles: store.listVehicles({ category: category || undefined }) });
  });

  router.get("/vehicles/:id", (req, res) => {
    const vehicle = store.findVehicle(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: { message: "Vehicle not found." } });
    }
    res.json({ vehicle });
  });

  // Search is a GET so results are linkable and cacheable.
  router.get("/availability", (req, res) => {
    const { valid, errors, value } = validateSearch(req.query);
    if (!valid) {
      return res.status(400).json({
        error: { message: "Check your search details.", fields: errors },
      });
    }

    const locationServed = store.servesLocation(value.pickupLocation);
    const vehicles = locationServed ? store.searchAvailability(value) : [];

    res.json({
      search: value,
      locationServed,
      servedLocations: store.servedLocations(),
      count: vehicles.length,
      vehicles,
    });
  });

  return router;
}
