import { defineConfig } from "vite";

const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

export default defineConfig({
  // The repo root doubles as the Vite root: index.html, css/ and js/ stay exactly
  // where GitHub Pages expects them, so the site still works unbuilt.
  root: ".",
  publicDir: false,
  server: {
    port: 5173,
    // Bind on all interfaces so the page is reachable from outside the dev container.
    host: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    host: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // The photography in images/ is deliberately large; don't warn on every asset.
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1000,
  },
});
