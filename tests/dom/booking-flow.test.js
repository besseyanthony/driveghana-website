/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../js/api/client.js";
import { initBookingFlow } from "../../js/modules/booking.js";
import { initCategories } from "../../js/modules/categories.js";
import { initNewsletter } from "../../js/modules/newsletter.js";
import { byId, loadIndexHtml, submitForm } from "../helpers/dom.js";

const NOW = new Date("2026-08-19T09:00:00.000Z");

const VEHICLES = [
  {
    id: "savanna-trail-suv",
    name: "Savanna Trail SUV",
    category: "suv",
    pricePerDay: 720,
    seats: 7,
    transmission: "Automatic",
    fuel: "Diesel",
    image: "images/category-suv.png",
    quote: { days: 3, pricePerDay: 720, subtotal: 2160, discount: 0, serviceFee: 108, total: 2268, currency: "GHS" },
  },
  {
    id: "accra-executive-class",
    name: "Accra Executive Class",
    category: "luxury",
    pricePerDay: 1400,
    seats: 4,
    transmission: "Automatic",
    fuel: "Hybrid",
    image: "images/category-luxury.png",
    quote: { days: 3, pricePerDay: 1400, subtotal: 4200, discount: 0, serviceFee: 210, total: 4410, currency: "GHS" },
  },
];

function availabilityPayload(params, vehicles = VEHICLES) {
  return {
    search: {
      pickupLocation: params.pickupLocation,
      pickupDate: params.pickupDate,
      returnDate: params.returnDate,
      ...(params.category ? { category: params.category } : {}),
    },
    locationServed: true,
    servedLocations: ["Accra", "Kumasi", "Takoradi", "Tamale", "Cape Coast", "Ho"],
    count: vehicles.length,
    vehicles,
  };
}

function fakeApi(overrides = {}) {
  return {
    availability: vi.fn(async (params) => availabilityPayload(params)),
    createBooking: vi.fn(async (payload) => ({
      booking: {
        reference: "DG-A1B2C3",
        vehicleId: payload.vehicleId,
        vehicleName: "Savanna Trail SUV",
        pickupLocation: payload.pickupLocation,
        pickupDate: payload.pickupDate,
        returnDate: payload.returnDate,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        quote: VEHICLES[0].quote,
        status: "confirmed",
      },
    })),
    subscribe: vi.fn(async (email) => ({ email, created: true, message: "You're on the list!" })),
    ...overrides,
  };
}

/** Fill the hero search bar with a valid future range. */
function fillSearch({ location = "Accra", pickup = "2026-08-20", dropoff = "2026-08-23" } = {}) {
  byId("pickupLocation").value = location;
  byId("pickupDate").value = pickup;
  byId("returnDate").value = dropoff;
}

function bookingElements() {
  return {
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
  };
}

function start(api) {
  return initBookingFlow({ elements: bookingElements(), api, now: () => NOW });
}

beforeEach(() => {
  loadIndexHtml();
});

describe("availability search", () => {
  it("calls the API with the entered criteria and renders a card per vehicle", async () => {
    const api = fakeApi();
    start(api);
    fillSearch();

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(2);
    });

    expect(api.availability).toHaveBeenCalledWith({
      pickupLocation: "Accra",
      pickupDate: "2026-08-20",
      returnDate: "2026-08-23",
      category: "",
    });
    expect(byId("searchResults").hidden).toBe(false);
    expect(byId("resultsTitle").textContent).toBe("2 vehicles available in Accra");
    expect(byId("resultsMeta").textContent).toContain("3 days");
  });

  it("shows the per-vehicle total and daily rate", async () => {
    start(fakeApi());
    fillSearch();
    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelector(".result-card")).toBeTruthy();
    });

    const card = byId("resultsGrid").querySelector(".result-card");
    expect(card.querySelector(".result-total strong").textContent).toBe("₵2,268");
    expect(card.querySelector(".price").textContent).toContain("₵720");
    expect(card.textContent).toContain("incl. ₵108 service fee");
  });

  it("takes each card's photo from the matching category tile", async () => {
    // The bundle rewrites the tile URLs to hashed asset paths, so borrowing them keeps
    // result photos working in the built site as well as the raw static one.
    const suvTile = byId("categoryRow").querySelector('[data-category="suv"] img');
    suvTile.setAttribute("src", "/assets/category-suv-HASHED.png");

    start(fakeApi());
    fillSearch();
    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(2);
    });

    const [suvCard] = byId("resultsGrid").querySelectorAll(".result-card");
    expect(suvCard.querySelector("img").getAttribute("src")).toBe(
      "/assets/category-suv-HASHED.png",
    );
  });

  it("falls back to the API image path when no matching tile exists", async () => {
    byId("categoryRow").remove();

    start(fakeApi());
    fillSearch();
    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(2);
    });

    expect(byId("resultsGrid").querySelector("img").getAttribute("src")).toBe(
      "images/category-suv.png",
    );
  });

  it("does not call the API when the location is blank", async () => {
    const api = fakeApi();
    start(api);
    fillSearch({ location: "  " });

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("searchStatus").hidden).toBe(false);
    });
    expect(api.availability).not.toHaveBeenCalled();
    expect(byId("searchStatus").dataset.tone).toBe("error");
  });

  it("does not call the API for a pick-up date in the past", async () => {
    const api = fakeApi();
    start(api);
    fillSearch({ pickup: "2026-08-01", dropoff: "2026-08-05" });

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("searchStatus").textContent).toMatch(/past/i);
    });
    expect(api.availability).not.toHaveBeenCalled();
  });

  it("explains when the city is not served", async () => {
    const api = fakeApi({
      availability: vi.fn(async (params) => ({
        ...availabilityPayload(params, []),
        locationServed: false,
      })),
    });
    start(api);
    fillSearch({ location: "Lagos" });

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsMeta").textContent).toMatch(/don't serve Lagos yet/i);
    });
    expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(0);
  });

  it("tells the visitor when every car is taken", async () => {
    const api = fakeApi({ availability: vi.fn(async (p) => availabilityPayload(p, [])) });
    start(api);
    fillSearch();

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelector(".results-empty")).toBeTruthy();
    });
    expect(byId("resultsTitle").textContent).toBe("No vehicles available in Accra");
  });

  it("surfaces a friendly message when the API is unreachable", async () => {
    const api = fakeApi({
      availability: vi.fn(async () => {
        throw new ApiError("We can't reach the booking service right now.", { status: 0 });
      }),
    });
    start(api);
    fillSearch();

    submitForm(byId("searchForm"));

    await vi.waitFor(() => {
      expect(byId("searchStatus").textContent).toMatch(/can't reach the booking service/i);
    });
    expect(byId("searchResults").hidden).toBe(true);
  });
});

describe("category filtering", () => {
  it("re-runs the search filtered by the clicked tile", async () => {
    const api = fakeApi();
    const booking = start(api);
    initCategories({ row: byId("categoryRow"), onSelect: (c) => booking.setCategory(c) });

    fillSearch();
    submitForm(byId("searchForm"));
    await vi.waitFor(() => expect(api.availability).toHaveBeenCalledTimes(1));

    byId("categoryRow").querySelector('[data-category="luxury"]').click();

    await vi.waitFor(() => expect(api.availability).toHaveBeenCalledTimes(2));
    expect(api.availability.mock.calls[1][0]).toMatchObject({
      pickupLocation: "Accra",
      category: "luxury",
    });
    expect(byId("clearFilter").hidden).toBe(false);
  });

  it("clears the filter again", async () => {
    const api = fakeApi();
    const booking = start(api);
    initCategories({ row: byId("categoryRow"), onSelect: (c) => booking.setCategory(c) });

    fillSearch();
    submitForm(byId("searchForm"));
    await vi.waitFor(() => expect(api.availability).toHaveBeenCalledTimes(1));

    byId("categoryRow").querySelector('[data-category="suv"]').click();
    await vi.waitFor(() => expect(byId("clearFilter").hidden).toBe(false));

    byId("clearFilter").click();

    await vi.waitFor(() => expect(api.availability).toHaveBeenCalledTimes(3));
    expect(api.availability.mock.calls[2][0].category).toBe("");
  });

  it("does not search when a tile is clicked before any search has run", async () => {
    const api = fakeApi();
    const booking = start(api);
    initCategories({ row: byId("categoryRow"), onSelect: (c) => booking.setCategory(c) });

    byId("categoryRow").querySelector('[data-category="suv"]').click();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.availability).not.toHaveBeenCalled();
  });
});

describe("reserving a vehicle", () => {
  async function searchThenReserve(api) {
    start(api);
    fillSearch();
    submitForm(byId("searchForm"));
    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(2);
    });
    byId("resultsGrid").querySelector(".result-reserve").click();
  }

  it("opens the reservation form for the chosen vehicle", async () => {
    await searchThenReserve(fakeApi());

    expect(byId("reserveForm").hidden).toBe(false);
    expect(byId("reserveVehicleName").textContent).toBe("Savanna Trail SUV");
    expect(byId("reserveSummary").textContent).toContain("Accra");
    expect(byId("reserveSummary").textContent).toContain("₵2,268");
  });

  it("posts the booking and shows the confirmed reference", async () => {
    const api = fakeApi();
    await searchThenReserve(api);

    byId("customerName").value = "Ama Mensah";
    byId("customerEmail").value = "ama@example.com";
    submitForm(byId("reserveForm"));

    await vi.waitFor(() => {
      expect(byId("bookingConfirmation").hidden).toBe(false);
    });

    expect(api.createBooking).toHaveBeenCalledWith({
      vehicleId: "savanna-trail-suv",
      pickupLocation: "Accra",
      pickupDate: "2026-08-20",
      returnDate: "2026-08-23",
      customerName: "Ama Mensah",
      customerEmail: "ama@example.com",
    });

    const confirmation = byId("bookingConfirmation").textContent;
    expect(confirmation).toContain("DG-A1B2C3");
    expect(confirmation).toContain("Savanna Trail SUV");
    expect(confirmation).toContain("₵2,268");
    expect(confirmation).toContain("ama@example.com");
    expect(byId("reserveForm").hidden).toBe(true);
  });

  it("refreshes availability after booking so the taken car disappears", async () => {
    const api = fakeApi();
    api.availability
      .mockImplementationOnce(async (p) => availabilityPayload(p))
      .mockImplementationOnce(async (p) => availabilityPayload(p, [VEHICLES[1]]));

    await searchThenReserve(api);
    byId("customerName").value = "Ama Mensah";
    byId("customerEmail").value = "ama@example.com";
    submitForm(byId("reserveForm"));

    await vi.waitFor(() => {
      expect(byId("resultsGrid").querySelectorAll(".result-card")).toHaveLength(1);
    });
    expect(api.availability).toHaveBeenCalledTimes(2);
    // The confirmation must survive the silent refresh.
    expect(byId("bookingConfirmation").hidden).toBe(false);
  });

  it("reports a booking conflict against the reservation form", async () => {
    const api = fakeApi({
      createBooking: vi.fn(async () => {
        throw new ApiError("The Savanna Trail SUV is already booked for those dates.", {
          status: 409,
          fields: { returnDate: "Try a different date range." },
        });
      }),
    });
    await searchThenReserve(api);

    byId("customerName").value = "Ama Mensah";
    byId("customerEmail").value = "ama@example.com";
    submitForm(byId("reserveForm"));

    await vi.waitFor(() => {
      expect(byId("reserveStatus").dataset.tone).toBe("error");
    });
    expect(byId("reserveStatus").textContent).toMatch(/already booked/i);
    expect(byId("reserveStatus").textContent).toMatch(/different date range/i);
    expect(byId("bookingConfirmation").hidden).toBe(true);
  });

  it("closes the form on cancel without booking", async () => {
    const api = fakeApi();
    await searchThenReserve(api);

    byId("reserveCancel").click();

    expect(byId("reserveForm").hidden).toBe(true);
    expect(api.createBooking).not.toHaveBeenCalled();
  });

  it("hides a previous confirmation when a new search starts", async () => {
    const api = fakeApi();
    await searchThenReserve(api);
    byId("customerName").value = "Ama Mensah";
    byId("customerEmail").value = "ama@example.com";
    submitForm(byId("reserveForm"));
    await vi.waitFor(() => expect(byId("bookingConfirmation").hidden).toBe(false));

    submitForm(byId("searchForm"));

    await vi.waitFor(() => expect(byId("bookingConfirmation").hidden).toBe(true));
  });
});

describe("newsletter signup", () => {
  function startNewsletter(api) {
    initNewsletter({
      form: byId("newsletterForm"),
      input: byId("newsletterEmail"),
      status: byId("newsletterStatus"),
      api,
    });
  }

  it("subscribes a valid address and clears the field", async () => {
    const api = fakeApi();
    startNewsletter(api);

    byId("newsletterEmail").value = "ama@example.com";
    submitForm(byId("newsletterForm"));

    await vi.waitFor(() => {
      expect(byId("newsletterStatus").dataset.tone).toBe("success");
    });
    expect(api.subscribe).toHaveBeenCalledWith("ama@example.com");
    expect(byId("newsletterStatus").textContent).toBe("You're on the list!");
    expect(byId("newsletterEmail").value).toBe("");
  });

  it("keeps the address on screen for a repeat signup", async () => {
    const api = fakeApi({
      subscribe: vi.fn(async (email) => ({
        email,
        created: false,
        message: "You're already subscribed. Nothing else to do!",
      })),
    });
    startNewsletter(api);

    byId("newsletterEmail").value = "ama@example.com";
    submitForm(byId("newsletterForm"));

    await vi.waitFor(() => {
      expect(byId("newsletterStatus").textContent).toMatch(/already subscribed/i);
    });
    expect(byId("newsletterEmail").value).toBe("ama@example.com");
  });

  it("rejects an invalid address without calling the API", async () => {
    const api = fakeApi();
    startNewsletter(api);

    byId("newsletterEmail").value = "not-an-email";
    submitForm(byId("newsletterForm"));

    await vi.waitFor(() => {
      expect(byId("newsletterStatus").dataset.tone).toBe("error");
    });
    expect(api.subscribe).not.toHaveBeenCalled();
  });
});
