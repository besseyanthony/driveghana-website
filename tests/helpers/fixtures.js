import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../../server/app.js";
import { createStore } from "../../server/store.js";
import { addDays, startOfToday, toISODate } from "../../shared/dates.js";

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** A fresh app + in-memory store per test, so suites never leak state into each other. */
export function buildApp() {
  const store = createStore();
  return { app: createApp({ store }), store };
}

/** ISO date `offset` days from today — keeps tests valid no matter when they run. */
export function isoIn(offset) {
  return toISODate(addDays(startOfToday(), offset));
}

/** A valid future rental range. */
export function futureRange({ start = 1, days = 3 } = {}) {
  return { pickupDate: isoIn(start), returnDate: isoIn(start + days) };
}

/** The real index.html, so DOM tests fail if a required hook is renamed or removed. */
export function readIndexHtml() {
  return readFileSync(resolve(ROOT_DIR, "index.html"), "utf8");
}
