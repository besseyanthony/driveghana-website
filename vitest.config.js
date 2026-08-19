import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node is the default because most suites exercise the API and shared logic.
    // DOM suites opt in with an `@vitest-environment jsdom` docblock.
    environment: "node",
    include: ["tests/**/*.test.js"],
    restoreMocks: true,
    coverage: {
      include: ["server/**/*.js", "shared/**/*.js", "js/**/*.js"],
      reporter: ["text", "html"],
    },
  },
});
