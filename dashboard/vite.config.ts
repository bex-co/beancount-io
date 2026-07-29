import { defineConfig } from "vite";
import { resolve } from "node:path";

import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro({
      devProxy: {
        // changeOrigin omitted — preserves Host: localhost:5173 from browser so
        // Koa's app.proxy=true can trust it and oidc-provider builds correct endpoint URLs.
        "/api-gateway/**": {
          target: "http://localhost:4104",
        },
        "/.well-known/**": {
          target: "http://localhost:4104",
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/components": resolve(__dirname, "./src/features/common/components"),
      "@/common": resolve(__dirname, "./src/features/common"),
      "@/lib": resolve(__dirname, "./src/features/common/lib"),
    },
  },
  build: {
    assetsDir: "lgassets",
    cssCodeSplit: false, // Bundle all CSS into one file for SSR
    sourcemap: true, // Enable source maps for better error debugging in production
    manifest: true, // Generate .vite/manifest.json for deterministic asset resolution
  },
});
