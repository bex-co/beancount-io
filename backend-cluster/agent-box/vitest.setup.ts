// Global test setup
import { vi } from 'vitest';

// Mock cloudflare:workers module for tests
vi.mock('cloudflare:workers', () => ({
  DurableObject: class MockDurableObject {
    constructor(public ctx: any, public env: any) {}
  },
}));

// Mock console methods in tests if needed
global.console = {
  ...console,
  // Uncomment to suppress logs in tests
  // log: vi.fn(),
  // error: vi.fn(),
  // warn: vi.fn(),
};
