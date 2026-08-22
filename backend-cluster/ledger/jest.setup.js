// Mute console output during tests while preserving originals for debugging
const originalConsole = { ...console };

jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "debug").mockImplementation(() => {});
jest.spyOn(console, "info").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

global.originalConsole = originalConsole;

// Multiple test files may add signal handlers via startServer()
process.setMaxListeners(0);
