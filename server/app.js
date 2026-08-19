import express from "express";

import { bookingsRouter } from "./routes/bookings.js";
import { newsletterRouter } from "./routes/newsletter.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { createStore } from "./store.js";

/**
 * Build the DriveGhana Express app.
 *
 * @param {object} [options]
 * @param {ReturnType<typeof createStore>} [options.store] Inject a store to isolate tests.
 * @param {string} [options.staticDir] Serve a built frontend from here (production only).
 */
export function createApp({ store = createStore(), staticDir } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/api", vehiclesRouter(store));
  app.use("/api", bookingsRouter(store));
  app.use("/api", newsletterRouter(store));

  // Anything else under /api is a client mistake — answer in JSON, never HTML.
  app.use("/api", (req, res) => {
    res.status(404).json({ error: { message: `No API route for ${req.method} ${req.originalUrl}` } });
  });

  if (staticDir) {
    app.use(express.static(staticDir));
  }

  // Malformed JSON bodies surface here as a SyntaxError from express.json().
  app.use((err, req, res, next) => {
    if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
      return res.status(400).json({ error: { message: "Request body is not valid JSON." } });
    }
    console.error("[api] unhandled error", err);
    res.status(500).json({ error: { message: "Something went wrong on our side." } });
  });

  app.locals.store = store;
  return app;
}
