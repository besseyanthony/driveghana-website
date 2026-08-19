import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp, futureRange } from "../helpers/fixtures.js";

let app;

beforeEach(() => {
  ({ app } = buildApp());
});

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
  });
});

describe("GET /api/locations", () => {
  it("lists the cities we serve", async () => {
    const response = await request(app).get("/api/locations").expect(200);
    expect(response.body.locations).toContain("Accra");
    expect(response.body.locations).toContain("Tamale");
  });
});

describe("GET /api/vehicles", () => {
  it("returns the whole fleet", async () => {
    const response = await request(app).get("/api/vehicles").expect(200);
    expect(response.body.vehicles).toHaveLength(6);
    expect(response.body.vehicles[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      pricePerDay: expect.any(Number),
    });
  });

  it("filters by category", async () => {
    const response = await request(app).get("/api/vehicles?category=sedan").expect(200);
    expect(response.body.vehicles).toHaveLength(2);
    expect(response.body.vehicles.every((v) => v.category === "sedan")).toBe(true);
  });

  it("returns an empty list for a category with no cars", async () => {
    const response = await request(app).get("/api/vehicles?category=hovercraft").expect(200);
    expect(response.body.vehicles).toEqual([]);
  });
});

describe("GET /api/vehicles/:id", () => {
  it("returns one vehicle", async () => {
    const response = await request(app).get("/api/vehicles/savanna-trail-suv").expect(200);
    expect(response.body.vehicle.name).toBe("Savanna Trail SUV");
  });

  it("404s for an unknown id", async () => {
    const response = await request(app).get("/api/vehicles/flying-carpet").expect(404);
    expect(response.body.error.message).toMatch(/not found/i);
  });
});

describe("GET /api/availability", () => {
  it("returns vehicles stationed in the requested city, each with a quote", async () => {
    const range = futureRange({ days: 3 });
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Accra", ...range })
      .expect(200);

    expect(response.body.locationServed).toBe(true);
    expect(response.body.count).toBe(6); // every car serves Accra
    expect(response.body.vehicles[0].quote).toMatchObject({
      days: 3,
      currency: "GHS",
      total: expect.any(Number),
    });
  });

  it("only returns cars stationed in a smaller city", async () => {
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Ho", ...futureRange() })
      .expect(200);

    expect(response.body.count).toBe(1);
    expect(response.body.vehicles[0].id).toBe("volta-workhorse-pickup");
  });

  it("matches the city case-insensitively", async () => {
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "cape coast", ...futureRange() })
      .expect(200);

    expect(response.body.locationServed).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);
  });

  it("narrows results by category", async () => {
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Accra", category: "luxury", ...futureRange() })
      .expect(200);

    expect(response.body.count).toBe(1);
    expect(response.body.vehicles[0].id).toBe("accra-executive-class");
  });

  it("flags an unserved city and suggests the ones we cover", async () => {
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Lagos", ...futureRange() })
      .expect(200);

    expect(response.body.locationServed).toBe(false);
    expect(response.body.vehicles).toEqual([]);
    expect(response.body.servedLocations).toContain("Accra");
  });

  it("rejects an invalid search with field-level errors", async () => {
    const response = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "", pickupDate: "not-a-date", returnDate: "" })
      .expect(400);

    expect(response.body.error.fields).toMatchObject({
      pickupLocation: expect.any(String),
      pickupDate: expect.any(String),
      returnDate: expect.any(String),
    });
  });
});

describe("unknown API routes", () => {
  it("answer with JSON, not HTML", async () => {
    const response = await request(app).get("/api/does-not-exist").expect(404);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body.error.message).toMatch(/No API route/);
  });
});
