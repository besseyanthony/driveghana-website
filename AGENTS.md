# AGENTS.md

## Cursor Cloud specific instructions

DriveGhana is a car-rental site made of two parts:

- **Frontend** — `index.html`, `css/styles.css` and ES modules under `js/`, bundled by **Vite**.
  It is a single page; there is no framework and no client-side router.
- **Backend** — an **Express** JSON API under `server/`, mounted entirely under `/api`.
- **`shared/`** — date, pricing and validation logic imported by *both* sides, so a quote shown
  in the browser always matches the total the API stores. Changing a rule here changes both.

Standard commands live in the `scripts` block of `package.json` (`dev`, `build`, `start`, `test`,
`lint`). Notes below cover only what those commands don't make obvious.

### Running it

`npm run dev` starts **two** processes via `concurrently`:

| Process | Port | Notes |
| --- | --- | --- |
| Vite dev server (`dev:web`) | 5173 | Open this one. Proxies `/api` → 3001. |
| Express API (`dev:api`) | 3001 | `node --watch`; restarts on any file change under `server/`. |

Browse the site at `http://localhost:5173` — **not** 3001. The API has no HTML to serve in dev; the
Vite proxy (configured in `vite.config.js`) is what joins the two halves. Override the proxy target
with `API_PROXY_TARGET` if you run the API elsewhere.

`npm start` is the production shape instead: it sets `NODE_ENV=production` so Express additionally
serves the built frontend from `dist/`, making port 3001 self-sufficient. It requires a prior
`npm run build`, and it will warn rather than fail if `dist/` is missing.

### Gotchas worth knowing

- **The API is optional at runtime.** This repo is also published as plain static files to GitHub
  Pages (`.nojekyll`), where no backend exists, so every request failure degrades to a friendly
  status message instead of a broken page. Note the specific rule in `js/api/client.js`: a static
  host answers `/api/*` with its own **HTML** 404, so the fetch *succeeds* and only the non-JSON
  body reveals that our API was never reached. Any non-JSON response is therefore reported as
  "service unreachable" rather than as a bare status code. Endpoints must always answer with a JSON
  body (no `204 No Content`) or the client will misread them as a missing backend.
- **Frontend imports must stay natively resolvable**: relative paths with explicit `.js`
  extensions, no bare specifiers, no `import.meta.glob`. That is what lets the same `js/` tree run
  through Vite *and* straight from a static file server. Importing an npm package into `js/` would
  break the unbuilt mode.
- **Never hand a runtime-built image path to the browser.** Vite rewrites the `images/` URLs in
  `index.html` to hashed `/assets/` names, so a path like `images/category-suv.png` coming from the
  API 404s in the built site. `resolveVehicleImage()` in `js/modules/booking.js` works around this
  by borrowing the already-resolved `src` from the matching category tile; reuse that approach for
  any new API-supplied artwork.
- **Dev data is a JSON file, not a database.** `server/store.js` writes bookings and subscribers to
  `.data/db.json` (gitignored). Delete that file to reset state — but the server only reads it at
  boot, so also restart the API (touching a file under `server/` is enough to trigger
  `node --watch`).
- **Tests inject their own store.** `createApp({ store: createStore() })` gives an isolated
  in-memory store with no file persistence; that is why the suite never touches `.data/`.
- Vitest runs in the `node` environment by default. DOM suites opt in with an
  `@vitest-environment jsdom` docblock, and they load the *real* `index.html`, so renaming an id or
  a `data-category` attribute will fail tests rather than silently break the page.

### Deployment note

GitHub Pages currently publishes the repository as-is, which still works (static content renders;
the booking API simply reports itself unreachable). To ship a working booking flow, the built
`dist/` output needs deploying to a host that can also run the Express server.
