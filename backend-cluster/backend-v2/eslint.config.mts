import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { requireGraphqlAccessDecorator } from "./scripts/eslint-rules/require-graphql-access-decorator";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
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
      "beancount-io/require-graphql-access-decorator": "error",
    },
    plugins: {
      "beancount-io": {
        rules: {
          "require-graphql-access-decorator": requireGraphqlAccessDecorator,
        },
      },
    },
  },
  {
    // Ignore auto-generated files
    ignores: ["src/foundation/fava/Api.ts"],
  },
]);
