import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Each test file gets its own module registry (default), so setting
    // process.env.DB_PATH per file before importing db.ts never leaks
    // into other files running in the same worker.
    isolate: true,
  },
});
