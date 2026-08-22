module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 10000,
  forceExit: true,
  roots: ["<rootDir>/src", "<rootDir>/parity"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
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
    "!src/gitea/client/**",
  ],
  coverageReporters: ["text-summary"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^winston-loki$": "<rootDir>/src/__mocks__/winston-loki.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
