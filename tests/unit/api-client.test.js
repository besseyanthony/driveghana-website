import { describe, expect, it, vi } from "vitest";

import { api, ApiError } from "../../js/api/client.js";

/** Build a fetch stub returning the given status and body. */
function jsonResponse(status, body) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

/** A response whose body is not JSON, e.g. a static host's HTML 404 page. */
function htmlResponse(status) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    },
  }));
}

describe("api.availability", () => {
  it("returns the parsed payload on success", async () => {
    const fetchImpl = jsonResponse(200, { count: 0, vehicles: [] });

    const result = await api.availability(
      { pickupLocation: "Accra", pickupDate: "2026-08-20", returnDate: "2026-08-23" },
      { fetchImpl },
    );

    expect(result).toEqual({ count: 0, vehicles: [] });
  });

  it("puts the search criteria in the query string", async () => {
    const fetchImpl = jsonResponse(200, { vehicles: [] });

    await api.availability(
      { pickupLocation: "Cape Coast", pickupDate: "2026-08-20", returnDate: "2026-08-23" },
      { fetchImpl },
    );

    const url = fetchImpl.mock.calls[0][0];
    expect(url.pathname).toBe("/api/availability");
    expect(url.searchParams.get("pickupLocation")).toBe("Cape Coast");
    expect(url.searchParams.get("returnDate")).toBe("2026-08-23");
  });

  it("omits empty, null and undefined params rather than sending blanks", async () => {
    const fetchImpl = jsonResponse(200, { vehicles: [] });

    await api.availability(
      { pickupLocation: "Accra", category: "", missing: undefined, nothing: null },
      { fetchImpl },
    );

    const url = fetchImpl.mock.calls[0][0];
    expect(url.searchParams.has("category")).toBe(false);
    expect(url.searchParams.has("missing")).toBe(false);
    expect(url.searchParams.has("nothing")).toBe(false);
  });
});

describe("error handling", () => {
  it("surfaces the API's message and field errors", async () => {
    const fetchImpl = jsonResponse(400, {
      error: { message: "Check your search details.", fields: { pickupDate: "Too early." } },
    });

    const error = await api.availability({}, { fetchImpl }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Check your search details.");
    expect(error.fields).toEqual({ pickupDate: "Too early." });
    expect(error.status).toBe(400);
    expect(error.isOffline).toBe(false);
  });

  it("reports a friendly message when the network request itself fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = await api.availability({}, { fetchImpl }).catch((e) => e);

    expect(error.message).toMatch(/can't reach the booking service/i);
    expect(error.isOffline).toBe(true);
  });

  it("treats a non-JSON error body as an unreachable service", async () => {
    // This is the GitHub Pages case: /api/* returns the host's HTML 404 page, so the
    // fetch succeeds and only the body reveals that our API was never involved.
    const error = await api.availability({}, { fetchImpl: htmlResponse(404) }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toMatch(/can't reach the booking service/i);
    expect(error.isOffline).toBe(true);
    expect(error.message).not.toMatch(/404/);
  });

  it("treats a non-JSON success body as an unreachable service too", async () => {
    const error = await api.availability({}, { fetchImpl: htmlResponse(200) }).catch((e) => e);
    expect(error.isOffline).toBe(true);
  });

  it("falls back to a generic message when the API omits one", async () => {
    const fetchImpl = jsonResponse(500, {});
    const error = await api.availability({}, { fetchImpl }).catch((e) => e);

    expect(error.message).toBe("Request failed (500).");
    expect(error.status).toBe(500);
  });
});

describe("write endpoints", () => {
  it("POSTs a booking as JSON", async () => {
    const fetchImpl = jsonResponse(201, { booking: { reference: "DG-ABC123" } });
    const payload = { vehicleId: "savanna-trail-suv", customerName: "Ama" };

    const result = await api.createBooking(payload, { fetchImpl });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.pathname).toBe("/api/bookings");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual(payload);
    expect(result.booking.reference).toBe("DG-ABC123");
  });

  it("POSTs a newsletter signup", async () => {
    const fetchImpl = jsonResponse(201, { created: true });

    await api.subscribe("ama@example.com", { fetchImpl });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.pathname).toBe("/api/newsletter");
    expect(JSON.parse(options.body)).toEqual({ email: "ama@example.com" });
  });
});
