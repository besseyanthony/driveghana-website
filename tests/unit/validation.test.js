import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  MAX_RENTAL_DAYS,
  validateBooking,
  validateSearch,
  validateSubscription,
} from "../../shared/validation.js";
import { isoIn } from "../helpers/fixtures.js";

const validSearch = () => ({
  pickupLocation: "Accra",
  pickupDate: isoIn(1),
  returnDate: isoIn(4),
});

const validBooking = () => ({
  ...validSearch(),
  vehicleId: "savanna-trail-suv",
  customerName: "Ama Mensah",
  customerEmail: "Ama@Example.com",
});

describe("isValidEmail", () => {
  it.each(["ama@example.com", "a.b+tag@sub.domain.gh", "driver_1@mail.co"])(
    "accepts %s",
    (email) => expect(isValidEmail(email)).toBe(true),
  );

  it.each(["ama@example", "ama.example.com", "@example.com", "ama@.com", "", " ", null])(
    "rejects %s",
    (email) => expect(isValidEmail(email)).toBe(false),
  );
});

describe("validateSearch", () => {
  it("accepts a well-formed search and returns trimmed values", () => {
    const result = validateSearch({ ...validSearch(), pickupLocation: "  Accra  " });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.value.pickupLocation).toBe("Accra");
  });

  it("requires a pick-up location", () => {
    const result = validateSearch({ ...validSearch(), pickupLocation: " " });
    expect(result.valid).toBe(false);
    expect(result.errors.pickupLocation).toBeDefined();
  });

  it("rejects a pick-up date in the past", () => {
    const result = validateSearch({ ...validSearch(), pickupDate: isoIn(-1) });
    expect(result.valid).toBe(false);
    expect(result.errors.pickupDate).toMatch(/past/i);
  });

  it("rejects a return date before the pick-up date", () => {
    const result = validateSearch({ pickupLocation: "Accra", pickupDate: isoIn(5), returnDate: isoIn(2) });
    expect(result.valid).toBe(false);
    expect(result.errors.returnDate).toMatch(/on or after/i);
  });

  it("allows a same-day rental", () => {
    const day = isoIn(2);
    expect(validateSearch({ pickupLocation: "Accra", pickupDate: day, returnDate: day }).valid).toBe(true);
  });

  it(`caps rentals at ${MAX_RENTAL_DAYS} days`, () => {
    const result = validateSearch({
      pickupLocation: "Accra",
      pickupDate: isoIn(1),
      returnDate: isoIn(1 + MAX_RENTAL_DAYS + 1),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.returnDate).toMatch(/capped/i);
  });

  it(`allows exactly ${MAX_RENTAL_DAYS} days`, () => {
    expect(
      validateSearch({
        pickupLocation: "Accra",
        pickupDate: isoIn(1),
        returnDate: isoIn(1 + MAX_RENTAL_DAYS),
      }).valid,
    ).toBe(true);
  });

  it("treats an empty category as no filter", () => {
    const result = validateSearch({ ...validSearch(), category: "" });
    expect(result.valid).toBe(true);
    expect(result.value.category).toBeUndefined();
  });

  it("normalises category casing and rejects unknown categories", () => {
    expect(validateSearch({ ...validSearch(), category: "SUV" }).value.category).toBe("suv");

    const bad = validateSearch({ ...validSearch(), category: "hovercraft" });
    expect(bad.valid).toBe(false);
    expect(bad.errors.category).toMatch(/Unknown category/);
  });

  it("uses an injected 'today' so results do not depend on the clock", () => {
    const today = new Date("2026-08-19T00:00:00.000Z");
    const result = validateSearch(
      { pickupLocation: "Accra", pickupDate: "2026-08-19", returnDate: "2026-08-22" },
      { today },
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateBooking", () => {
  it("accepts a complete booking and lowercases the email", () => {
    const result = validateBooking(validBooking());
    expect(result.valid).toBe(true);
    expect(result.value.customerEmail).toBe("ama@example.com");
    expect(result.value.customerName).toBe("Ama Mensah");
  });

  it("requires a vehicle, a name and a valid email", () => {
    const result = validateBooking({
      ...validSearch(),
      vehicleId: "",
      customerName: "A",
      customerEmail: "nope",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.vehicleId).toBeDefined();
    expect(result.errors.customerName).toBeDefined();
    expect(result.errors.customerEmail).toBeDefined();
  });

  it("collects every field error at once rather than failing on the first", () => {
    const result = validateBooking({});
    expect(Object.keys(result.errors).sort()).toEqual(
      ["customerEmail", "customerName", "pickupDate", "pickupLocation", "returnDate", "vehicleId"],
    );
  });
});

describe("validateSubscription", () => {
  it("accepts and normalises a valid email", () => {
    const result = validateSubscription({ email: "  Ama@Example.COM " });
    expect(result.valid).toBe(true);
    expect(result.value.email).toBe("ama@example.com");
  });

  it("rejects an invalid email", () => {
    const result = validateSubscription({ email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });
});
