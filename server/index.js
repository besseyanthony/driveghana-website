// Server entry point. `npm run dev:api` runs this under `node --watch`; `npm start`
// runs it in production mode where it also serves the built frontend from dist/.

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { createStore } from "./store.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";

const distDir = resolve(rootDir, "dist");
const serveDist = isProduction && existsSync(distDir);

if (isProduction && !serveDist) {
  console.warn("[api] dist/ not found — run `npm run build` before `npm start`.");
}

const app = createApp({
  store: createStore({ persistPath: resolve(rootDir, ".data/db.json") }),
  staticDir: serveDist ? distDir : undefined,
});

app.listen(port, () => {
  console.log(`[api] DriveGhana API listening on http://localhost:${port}`);
  if (serveDist) console.log(`[api] serving built frontend from ${distDir}`);
  if (!isProduction) console.log("[api] dev mode — Vite serves the frontend on port 5173");
});
