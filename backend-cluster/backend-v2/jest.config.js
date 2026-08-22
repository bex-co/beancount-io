module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 10000,
  forceExit: true,
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__test__/**/*.test.ts",
    "**/*.test.ts",
  ],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        diagnostics: {
          ignoreCodes: ["TS2307", "TS7006"],
        },
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    // Transform jose and oidc-provider (+ its ESM-only deps) since they use ESM syntax.
    // ai@7 and the whole @ai-sdk scope are pure ESM (type: module), so Jest must
    // transform them too (m17/t004).
    "node_modules/(jose|oidc-provider|nanoid|quick-lru|eta|ai|@ai-sdk/.+|@workflow/.+|@vercel/.+|eventsource-parser)/.+\\.js$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/__test__/**",
    "!src/**/__integration__/**",
    "!src/**/__migration__/**",
  ],
  coverageReporters: ["text-summary"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^winston-loki$": "<rootDir>/src/__mocks__/winston-loki.js",
  },
  transformIgnorePatterns: [
    // Transform ESM-only packages (jose, oidc-provider + its ESM-only deps, and
    // the ai@7 / @ai-sdk stack which is pure ESM).
    "node_modules/(?!(?:jose|oidc-provider|nanoid|quick-lru|eta|ai|@ai-sdk|@workflow|@vercel|eventsource-parser)/)",
  ],
  setupFiles: ["<rootDir>/jest.setup-mocks.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
