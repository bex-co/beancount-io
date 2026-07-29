import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      quoteStyle: "double",
      semicolons: true,
      routeFileIgnorePattern: "__tests__",
    }),
    react(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    testTimeout: 10000,
    setupFiles: ["./src/test/setup.ts"],
    // Provide a GA4 measurement ID so analytics helpers are "available" in
    // tests (analytics is disabled when VITE_GA_MEASUREMENT_ID is unset).
    env: {
      VITE_GA_MEASUREMENT_ID: "G-Y0WGKFHE3E",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "dist/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock monaco-editor for tests
      "monaco-editor": path.resolve(
        __dirname,
        "./src/test/mocks/monaco-editor.ts",
      ),
    },
  },
});
