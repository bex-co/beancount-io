import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      // Warn on explicit 'any' usage to encourage better typing
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow underscore-prefixed parameters to be unused (common pattern for extensible methods)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Ignore auto-generated files
    ignores: [
      "src/gitea/client/gitea-api.ts",
      "src/features/gitea/client/gitea-api.ts",
      "src/__mocks__/**",
      "dist/**",
    ],
  },
]);
