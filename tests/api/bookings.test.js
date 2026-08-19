import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp, futureRange, isoIn } from "../helpers/fixtures.js";

let app;

const booking = (overrides = {}) => ({
  vehicleId: "savanna-trail-suv",
  pickupLocation: "Accra",
  customerName: "Ama Mensah",
  customerEmail: "ama@example.com",
  ...futureRange({ start: 1, days: 3 }),
  ...overrides,
});

beforeEach(() => {
  ({ app } = buildApp());
});

describe("POST /api/bookings", () => {
  it("creates a confirmed booking with a reference and a priced quote", async () => {
    const response = await request(app).post("/api/bookings").send(booking()).expect(201);

    expect(response.body.booking).toMatchObject({
      reference: expect.stringMatching(/^DG-[0-9A-F]{6}$/),
      vehicleId: "savanna-trail-suv",
      vehicleName: "Savanna Trail SUV",
      status: "confirmed",
      customerEmail: "ama@example.com",
    });
    // 720/day for 3 days + 5% service fee.
    expect(response.body.booking.quote).toMatchObject({ days: 3, subtotal: 2160, total: 2268 });
  });

  it("issues a distinct reference per booking", async () => {
    const first = await request(app).post("/api/bookings").send(booking()).expect(201);
    const second = await request(app)
      .post("/api/bookings")
      .send(booking({ vehicleId: "accra-executive-class" }))
      .expect(201);

    expect(first.body.booking.reference).not.toBe(second.body.booking.reference);
  });

  it("rejects a booking with missing customer details", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ customerName: "", customerEmail: "bad" }))
      .expect(400);

    expect(response.body.error.fields).toMatchObject({
      customerName: expect.any(String),
      customerEmail: expect.any(String),
    });
  });

  it("rejects a pick-up date in the past", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ pickupDate: isoIn(-2), returnDate: isoIn(1) }))
      .expect(400);

    expect(response.body.error.fields.pickupDate).toMatch(/past/i);
  });

  it("404s when the vehicle does not exist", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ vehicleId: "flying-carpet" }))
      .expect(404);

    expect(response.body.error.message).toMatch(/no longer in our fleet/i);
  });

  it("400s for a city we do not serve", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ pickupLocation: "Lagos" }))
      .expect(400);

    expect(response.body.error.fields.pickupLocation).toMatch(/Accra/);
  });

  it("409s when the car is not stationed in that city", async () => {
    // The executive class only operates out of Accra.
    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ vehicleId: "accra-executive-class", pickupLocation: "Kumasi" }))
      .expect(409);

    expect(response.body.error.message).toMatch(/not stationed in Kumasi/);
  });

  it("rejects a malformed JSON body with 400 rather than crashing", async () => {
    const response = await request(app)
      .post("/api/bookings")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);

    expect(response.body.error.message).toMatch(/not valid JSON/i);
  });
});

describe("double-booking protection", () => {
  it("409s when the same car is already booked for overlapping dates", async () => {
    await request(app).post("/api/bookings").send(booking()).expect(201);

    const response = await request(app)
      .post("/api/bookings")
      .send(booking({ customerEmail: "kofi@example.com", ...futureRange({ start: 2, days: 2 }) }))
      .expect(409);

    expect(response.body.error.message).toMatch(/already booked/i);
  });

  it("allows the same car for a range that does not overlap", async () => {
    await request(app).post("/api/bookings").send(booking()).expect(201);

    await request(app)
      .post("/api/bookings")
      .send(booking({ ...futureRange({ start: 10, days: 2 }) }))
      .expect(201);
  });

  it("allows a pick-up on the day another rental is returned", async () => {
    // Ranges are half-open: the car is cleaned and handed straight over.
    await request(app)
      .post("/api/bookings")
      .send(booking({ pickupDate: isoIn(1), returnDate: isoIn(4) }))
      .expect(201);

    await request(app)
      .post("/api/bookings")
      .send(booking({ pickupDate: isoIn(4), returnDate: isoIn(6) }))
      .expect(201);
  });

  it("does not block a different vehicle over the same dates", async () => {
    await request(app).post("/api/bookings").send(booking()).expect(201);
    await request(app)
      .post("/api/bookings")
      .send(booking({ vehicleId: "kumasi-cruiser-sedan" }))
      .expect(201);
  });

  it("hides a booked car from availability, then shows it again for free dates", async () => {
    const range = futureRange({ start: 1, days: 3 });
    await request(app).post("/api/bookings").send(booking(range)).expect(201);

    const taken = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Accra", ...range })
      .expect(200);
    expect(taken.body.vehicles.map((v) => v.id)).not.toContain("savanna-trail-suv");

    const free = await request(app)
      .get("/api/availability")
      .query({ pickupLocation: "Accra", ...futureRange({ start: 30, days: 2 }) })
      .expect(200);
    expect(free.body.vehicles.map((v) => v.id)).toContain("savanna-trail-suv");
  });
});

describe("reading bookings back", () => {
  it("lists bookings and fetches one by reference", async () => {
    const created = await request(app).post("/api/bookings").send(booking()).expect(201);
    const { reference } = created.body.booking;

    const list = await request(app).get("/api/bookings").expect(200);
    expect(list.body.bookings).toHaveLength(1);

    const single = await request(app).get(`/api/bookings/${reference}`).expect(200);
    expect(single.body.booking.reference).toBe(reference);
  });

  it("looks a reference up case-insensitively", async () => {
    const created = await request(app).post("/api/bookings").send(booking()).expect(201);
    const { reference } = created.body.booking;

    await request(app).get(`/api/bookings/${reference.toLowerCase()}`).expect(200);
  });

  it("404s for an unknown reference", async () => {
    await request(app).get("/api/bookings/DG-000000").expect(404);
  });

  it("starts empty", async () => {
    const response = await request(app).get("/api/bookings").expect(200);
    expect(response.body.bookings).toEqual([]);
  });
});
