// Standalone config: kept separate from vite.config.ts because that file is
// wrapped by @lovable.dev/vite-tanstack-config, which doesn't expose a `test`
// passthrough. Vitest picks this file up automatically instead of vite.config.ts.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
  },
});
