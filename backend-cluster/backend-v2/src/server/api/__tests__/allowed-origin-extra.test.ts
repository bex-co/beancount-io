import { isAllowedOrigin } from "../allowed-origin";

describe("isAllowedOrigin with EXTRA_ALLOWED_ORIGINS", () => {
  const original = process.env.EXTRA_ALLOWED_ORIGINS;
  afterEach(() => {
    if (original === undefined) delete process.env.EXTRA_ALLOWED_ORIGINS;
    else process.env.EXTRA_ALLOWED_ORIGINS = original;
  });

  it("refuses a foreign origin by default", () => {
    delete process.env.EXTRA_ALLOWED_ORIGINS;
    expect(isAllowedOrigin("https://app.example.com")).toBe(false);
  });

  it("trusts only the exact listed origins", () => {
    process.env.EXTRA_ALLOWED_ORIGINS =
      "https://app.example.com/, https://other.example.com";
    expect(isAllowedOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedOrigin("https://other.example.com")).toBe(true);
    expect(isAllowedOrigin("https://app.example.com.evil.test")).toBe(false);
    expect(isAllowedOrigin("http://app.example.com")).toBe(false);
  });
});
