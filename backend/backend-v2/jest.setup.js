// Mute console output during tests while preserving original methods for debugging if needed
// Store originals in case tests need to access them
const originalConsole = { ...console };

// Mock console methods to suppress output
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "debug").mockImplementation(() => {});
jest.spyOn(console, "info").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// Expose originals if tests need them
global.originalConsole = originalConsole;

// Increase max listeners to prevent warnings during tests
// Multiple test files may add signal handlers (SIGTERM, SIGINT) via startServer()
// This is expected in tests but not an issue in production (where startServer is called once)
process.setMaxListeners(0); // 0 = unlimited
