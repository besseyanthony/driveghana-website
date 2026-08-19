import { describe, expect, it } from "vitest";

import {
  formatCedis,
  quote,
  SERVICE_FEE_RATE,
  WEEKLY_DISCOUNT_RATE,
} from "../../shared/pricing.js";

describe("quote", () => {
  it("multiplies the daily rate by the number of days and adds the service fee", () => {
    const result = quote(450, "2026-08-19", "2026-08-22");

    expect(result.days).toBe(3);
    expect(result.subtotal).toBe(1350);
    expect(result.discount).toBe(0);
    expect(result.serviceFee).toBe(Math.round(1350 * SERVICE_FEE_RATE));
    expect(result.total).toBe(1350 + result.serviceFee);
    expect(result.currency).toBe("GHS");
  });

  it("applies the weekly discount from the seventh day onwards", () => {
    const result = quote(450, "2026-08-19", "2026-08-26");

    expect(result.days).toBe(7);
    expect(result.subtotal).toBe(3150);
    expect(result.discount).toBe(Math.round(3150 * WEEKLY_DISCOUNT_RATE));
    // The service fee is charged on the discounted subtotal, not the gross one.
    expect(result.serviceFee).toBe(Math.round((3150 - result.discount) * SERVICE_FEE_RATE));
    expect(result.total).toBe(3150 - result.discount + result.serviceFee);
  });

  it("does not discount a six-day rental", () => {
    expect(quote(450, "2026-08-19", "2026-08-25").discount).toBe(0);
  });

  it("charges one day for a same-day rental", () => {
    const result = quote(390, "2026-08-19", "2026-08-19");
    expect(result.days).toBe(1);
    expect(result.subtotal).toBe(390);
  });

  it("returns a zero quote for an invalid range instead of NaN", () => {
    const result = quote(450, "2026-08-22", "2026-08-19");
    expect(result.days).toBe(0);
    expect(result.total).toBe(0);
    expect(Number.isNaN(result.total)).toBe(false);
  });

  it("returns whole cedi amounts only", () => {
    const result = quote(333, "2026-08-19", "2026-08-20");
    for (const amount of [result.subtotal, result.discount, result.serviceFee, result.total]) {
      expect(Number.isInteger(amount)).toBe(true);
    }
  });
});

describe("formatCedis", () => {
  it("prefixes the cedi sign and groups thousands", () => {
    expect(formatCedis(1400)).toBe("₵1,400");
    expect(formatCedis(450)).toBe("₵450");
    expect(formatCedis(12500)).toBe("₵12,500");
  });

  it("rounds fractional amounts", () => {
    expect(formatCedis(1399.6)).toBe("₵1,400");
  });
});
