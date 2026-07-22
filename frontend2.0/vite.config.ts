import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { imagetools } from "vite-imagetools";

// Self-contained config: this project no longer uses Lovable (only used to
// scaffold the original UI/UX). No `nitro` deploy target is configured on
// purpose — we haven't picked a hosting platform yet (Fase 6, pending), and
// nitro's own output format (dist/server/index.mjs + _chunks/_libs) replaces
// the plain Vite SSR bundle (dist/server/server.js) that `vite preview`'s
// built-in preview-server-plugin expects. Without nitro, the default
// TanStack Start Vite build produces that server.js directly.
export default defineConfig({
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
  },
  css: { transformer: "lightningcss" },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // Resizes/re-encodes src/assets/* images at import time (see showcase.data.ts
    // query params) — fixes Lighthouse's "oversized image" + "modern format" findings
    // without hand-editing binary files (sharp does the actual work under the hood).
    imagetools(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
  ],
  server: {
    host: "::",
    port: 8080,
  },
});
