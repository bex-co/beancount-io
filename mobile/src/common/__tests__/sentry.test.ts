/**
 * Tests the real `captureError`. This file used to re-declare the logic inline and
 * assert against its own copy, so it could not fail; the module's native and
 * `@/` dependencies are now replaced with stand-ins the runner can load.
 */
import { freshRequire, interceptModules } from "./fixtures/intercept-modules";

type SentryMock = typeof import("./fixtures/mock-sentry");
type Subject = typeof import("../sentry/capture");

const SENTRY = require.resolve("./fixtures/mock-sentry");
const SUBJECT = require.resolve("../sentry/capture");
let restore: () => void;
let sentry: SentryMock;
let captureError: Subject["captureError"];

beforeAll(() => {
  restore = interceptModules({ "@sentry/react-native": SENTRY });
  sentry = require(SENTRY) as SentryMock;
  ({ captureError } = freshRequire<Subject>(SUBJECT));
});

afterAll(() => {
  restore();
  delete require.cache[SUBJECT];
});

describe("captureError", () => {
  it("sends the error with its context as extra data", () => {
    sentry.resetSentry();
    const error = new Error("upload failed");
    captureError(error, { phase: "upload", code: 413 });
    expect(sentry.captured).toEqual([
      { error, hint: { extra: { phase: "upload", code: 413 } } },
    ]);
  });

  it("sends no hint when there is no context", () => {
    sentry.resetSentry();
    captureError("plain failure");
    expect(sentry.captured).toEqual([
      { error: "plain failure", hint: undefined },
    ]);
  });

  it("swallows a failing capture so reporting never replaces the original error", () => {
    sentry.resetSentry();
    sentry.sentryControl.throwOnCapture = true;
    expect(() => captureError(new Error("original"))).not.toThrow();
  });
});
