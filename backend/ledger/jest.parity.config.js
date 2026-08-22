// Parity suites run against the LIVE dual-target stack (parity/up.sh first).
// maxWorkers 1: suites share live repos (fixture resets, collaborator churn) —
// parallel workers would race each other's Gitea state.
module.exports = {
  maxWorkers: 1,
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 60000,
  forceExit: true,
  roots: ["<rootDir>/parity"],
  testMatch: ["**/*.integration.test.ts"],
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
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^winston-loki$": "<rootDir>/src/__mocks__/winston-loki.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
