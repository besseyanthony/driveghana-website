import { describe, expect, it } from "vitest";

import {
  addDays,
  parseISODate,
  rentalDays,
  startOfToday,
  toISODate,
} from "../../shared/dates.js";

describe("parseISODate", () => {
  it("parses a calendar date at UTC midnight", () => {
    const date = parseISODate("2026-08-19");
    expect(date.toISOString()).toBe("2026-08-19T00:00:00.000Z");
  });

  it("rejects anything that is not a YYYY-MM-DD string", () => {
    for (const value of ["19-08-2026", "2026/08/19", "", "  ", null, undefined, 20260819, {}]) {
      expect(parseISODate(value)).toBeNull();
    }
  });

  it("rejects dates that do not exist in the calendar", () => {
    // Without the round-trip check these silently roll into the next month.
    expect(parseISODate("2026-02-31")).toBeNull();
    expect(parseISODate("2026-13-01")).toBeNull();
    expect(parseISODate("2025-02-29")).toBeNull();
  });

  it("accepts a real leap day", () => {
    expect(parseISODate("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
});

describe("toISODate / addDays / startOfToday", () => {
  it("round-trips a date through ISO formatting", () => {
    expect(toISODate(parseISODate("2026-12-31"))).toBe("2026-12-31");
  });

  it("adds days across a month boundary", () => {
    expect(toISODate(addDays(parseISODate("2026-08-30"), 3))).toBe("2026-09-02");
  });

  it("adds days across a year boundary", () => {
    expect(toISODate(addDays(parseISODate("2026-12-30"), 5))).toBe("2027-01-04");
  });

  it("normalises any time of day to UTC midnight", () => {
    expect(startOfToday(new Date("2026-08-19T23:45:12.000Z")).toISOString()).toBe(
      "2026-08-19T00:00:00.000Z",
    );
  });
});

describe("rentalDays", () => {
  it("counts whole days between two dates", () => {
    expect(rentalDays("2026-08-19", "2026-08-22")).toBe(3);
  });

  it("bills a same-day rental as one day", () => {
    expect(rentalDays("2026-08-19", "2026-08-19")).toBe(1);
  });

  it("returns 0 for a reversed range", () => {
    expect(rentalDays("2026-08-22", "2026-08-19")).toBe(0);
  });

  it("returns 0 when either date is unparseable", () => {
    expect(rentalDays("nonsense", "2026-08-22")).toBe(0);
    expect(rentalDays("2026-08-19", "")).toBe(0);
  });

  it("accepts Date objects as well as strings", () => {
    expect(rentalDays(parseISODate("2026-08-19"), parseISODate("2026-08-26"))).toBe(7);
  });
});
