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
      // Radix/sonner/cmdk ship "use client" for Next.js App Router. TanStack
      // Start is plain SSR, not RSC, so the directive Rollup drops while
      // bundling changes nothing at runtime — it only floods the server build
      // log with one line per package.
      //
      // defu gives `rollupConfig` priority over nitro's own onwarn, so this
      // *replaces* rather than wraps it. That means we have to re-suppress
      // nitro's own ignoreWarningCodes here (nitro/dist/_build/common.mjs) or
      // they'd start leaking through.
      rollupConfig: {
        onwarn(warning, defaultHandler) {
          const ignored = new Set([
            "MODULE_LEVEL_DIRECTIVE",
            // nitro's defaults, mirrored:
            "EVAL",
            "CIRCULAR_DEPENDENCY",
            "THIS_IS_UNDEFINED",
            "EMPTY_BUNDLE",
          ]);
          if (ignored.has(warning.code ?? "")) return;
          defaultHandler(warning);
        },
      },
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
