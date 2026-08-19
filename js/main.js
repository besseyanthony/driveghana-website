// DriveGhana frontend entry point.
//
// Written as native ES modules with explicit relative paths, so the page works both
// through the Vite dev server / bundle and when the repo is served as plain static
// files (which is how GitHub Pages publishes it).

import { initBookingFlow } from "./modules/booking.js";
import { initCategories } from "./modules/categories.js";
import { applyDefaultDates } from "./modules/date-defaults.js";
import { initNav } from "./modules/nav.js";
import { initNewsletter } from "./modules/newsletter.js";
import { initReveal } from "./modules/reveal.js";

const byId = (id) => document.getElementById(id);

initNav({ toggle: byId("navToggle"), links: byId("navLinks") });

applyDefaultDates({
  pickupInput: byId("pickupDate"),
  returnInput: byId("returnDate"),
});

const booking = initBookingFlow({
  elements: {
    searchForm: byId("searchForm"),
    pickupLocation: byId("pickupLocation"),
    pickupDate: byId("pickupDate"),
    returnDate: byId("returnDate"),
    searchStatus: byId("searchStatus"),
    resultsSection: byId("searchResults"),
    resultsTitle: byId("resultsTitle"),
    resultsMeta: byId("resultsMeta"),
    resultsGrid: byId("resultsGrid"),
    clearFilter: byId("clearFilter"),
    reserveForm: byId("reserveForm"),
    reserveVehicleName: byId("reserveVehicleName"),
    reserveSummary: byId("reserveSummary"),
    customerName: byId("customerName"),
    customerEmail: byId("customerEmail"),
    reserveStatus: byId("reserveStatus"),
    reserveCancel: byId("reserveCancel"),
    bookingConfirmation: byId("bookingConfirmation"),
  },
});

initCategories({
  row: byId("categoryRow"),
  onSelect: (category) => booking?.setCategory(category),
});

initNewsletter({
  form: byId("newsletterForm"),
  input: byId("newsletterEmail"),
  status: byId("newsletterStatus"),
});

initReveal();
