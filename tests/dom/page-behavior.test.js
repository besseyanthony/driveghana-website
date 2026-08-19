/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initCategories } from "../../js/modules/categories.js";
import { applyDefaultDates } from "../../js/modules/date-defaults.js";
import { initNav } from "../../js/modules/nav.js";
import { initReveal } from "../../js/modules/reveal.js";
import { byId, loadIndexHtml, setValue } from "../helpers/dom.js";

beforeEach(() => {
  loadIndexHtml();
});

describe("mobile navigation", () => {
  it("opens and closes on toggle, keeping aria-expanded in sync", () => {
    const toggle = byId("navToggle");
    const links = byId("navLinks");
    initNav({ toggle, links });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();
    expect(links.classList.contains("open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    toggle.click();
    expect(links.classList.contains("open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the menu when a nav link is followed", () => {
    const toggle = byId("navToggle");
    const links = byId("navLinks");
    initNav({ toggle, links });

    toggle.click();
    links.querySelector("a").click();

    expect(links.classList.contains("open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("does nothing when the elements are absent", () => {
    expect(() => initNav({})).not.toThrow();
  });
});

describe("category tiles", () => {
  it("ships one active tile and a data-category on every tile", () => {
    const tiles = [...byId("categoryRow").querySelectorAll(".category-tile")];
    expect(tiles).toHaveLength(5);
    expect(tiles.filter((t) => t.classList.contains("active"))).toHaveLength(1);
    expect(tiles.map((t) => t.dataset.category)).toEqual([
      "sedan",
      "suv",
      "minivan",
      "pickup",
      "luxury",
    ]);
  });

  it("moves the active state to the clicked tile and reports its category", () => {
    const onSelect = vi.fn();
    const row = byId("categoryRow");
    initCategories({ row, onSelect });

    const suv = row.querySelector('[data-category="suv"]');
    suv.click();

    expect(suv.classList.contains("active")).toBe(true);
    expect(row.querySelectorAll(".category-tile.active")).toHaveLength(1);
    expect(onSelect).toHaveBeenCalledWith("suv");
    expect(suv.getAttribute("aria-pressed")).toBe("true");
  });

  it("only ever keeps one tile active", () => {
    const row = byId("categoryRow");
    const categories = initCategories({ row });

    row.querySelector('[data-category="suv"]').click();
    row.querySelector('[data-category="luxury"]').click();

    expect(row.querySelectorAll(".category-tile.active")).toHaveLength(1);
    expect(categories.getSelected()).toBe("luxury");
  });

  it("can be driven programmatically", () => {
    const categories = initCategories({ row: byId("categoryRow") });
    categories.select("pickup");
    expect(categories.getSelected()).toBe("pickup");
  });
});

describe("default search dates", () => {
  it("pre-fills today and today + 3 days", () => {
    const result = applyDefaultDates({
      pickupInput: byId("pickupDate"),
      returnInput: byId("returnDate"),
      now: new Date("2026-08-19T09:00:00.000Z"),
    });

    expect(result).toEqual({ pickupDate: "2026-08-19", returnDate: "2026-08-22" });
    expect(byId("pickupDate").value).toBe("2026-08-19");
    expect(byId("returnDate").value).toBe("2026-08-22");
  });

  it("stops the visitor picking a pick-up date in the past", () => {
    applyDefaultDates({
      pickupInput: byId("pickupDate"),
      returnInput: byId("returnDate"),
      now: new Date("2026-08-19T09:00:00.000Z"),
    });

    expect(byId("pickupDate").min).toBe("2026-08-19");
  });

  it("pushes the return date forward when the pick-up date moves past it", () => {
    const pickupInput = byId("pickupDate");
    const returnInput = byId("returnDate");
    applyDefaultDates({ pickupInput, returnInput, now: new Date("2026-08-19T09:00:00.000Z") });

    setValue(pickupInput, "2026-09-10");

    expect(returnInput.value).toBe("2026-09-10");
    expect(returnInput.min).toBe("2026-09-10");
  });

  it("leaves a return date that is already later alone", () => {
    const pickupInput = byId("pickupDate");
    const returnInput = byId("returnDate");
    applyDefaultDates({ pickupInput, returnInput, now: new Date("2026-08-19T09:00:00.000Z") });

    setValue(pickupInput, "2026-08-20");

    expect(returnInput.value).toBe("2026-08-22");
  });
});

describe("scroll reveal", () => {
  it("shows everything immediately when IntersectionObserver is missing", () => {
    const original = globalThis.IntersectionObserver;
    delete globalThis.IntersectionObserver;

    try {
      initReveal();
      const cards = [...document.querySelectorAll(".fleet-card")];
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every((card) => card.classList.contains("visible"))).toBe(true);
    } finally {
      if (original) globalThis.IntersectionObserver = original;
    }
  });

  it("observes reveal targets when IntersectionObserver exists", () => {
    const observe = vi.fn();
    globalThis.IntersectionObserver = class {
      observe = observe;
      unobserve = vi.fn();
    };

    initReveal();

    expect(observe).toHaveBeenCalled();
    expect(document.querySelectorAll(".reveal").length).toBeGreaterThan(0);
    delete globalThis.IntersectionObserver;
  });
});
