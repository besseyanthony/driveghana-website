# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **fully static website** (the "DriveGhana" car-rental landing page). There is
no package manager, no build system, no backend, and no automated tests or linters configured.
Structure: `index.html` (single page), `css/styles.css`, `js/script.js`, and `images/`. It is
deployed as-is via GitHub Pages (`.nojekyll` disables Jekyll processing).

### Running it (development)

Serve the repository root over HTTP and open the page in a browser — do NOT open `index.html`
via the `file://` protocol, because relative asset paths and some browser behaviors differ:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

Any static file server works (`python3 -m http.server`, `npx serve`, etc.); Python 3 is
preinstalled, so it needs no dependency install. There is no hot-reload — refresh the browser
after editing files.

### Build / lint / test

- **Build:** none. The files are served directly; there is nothing to compile.
- **Lint / test:** no linter or test suite exists in this repo. If asked to add checks, none are
  currently wired up.

### Behavior notes (non-obvious)

- `js/script.js` sets the Pick-up/Return date inputs on page load (today and today+3), toggles a
  single active car-category tile on click, drives the mobile nav toggle, and runs an
  `IntersectionObserver` scroll-reveal animation. These require the page to be loaded in a browser
  to run; a plain `curl` of `index.html` will not execute them.
- The booking search `<form>` uses `onsubmit="return false;"` — it is a non-functional UI demo and
  does not submit anywhere.
