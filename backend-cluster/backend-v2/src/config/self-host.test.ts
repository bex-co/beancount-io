import { isSelfHost, readSelfHost } from "./self-host";

describe("readSelfHost", () => {
  it.each([
    "true",
    "TRUE",
    "True",
    " true ",
    "1",
    "yes",
    "Y",
    "on",
    "ON",
    '"true"',
    "'true'",
    ' "true" ',
  ])("turns on for %p", (value) => {
    expect(readSelfHost(value)).toEqual({ on: true });
  });

  it.each([
    undefined,
    "",
    "   ",
    "false",
    "FALSE",
    "0",
    "no",
    "n",
    "off",
    '"false"',
  ])("stays off, without complaint, for %p", (value) => {
    expect(readSelfHost(value)).toEqual({ on: false });
  });

  it.each(["ture", "2", "enabled", "truee", '"true', "true,", "t"])(
    "stays off and reports %p as unrecognised",
    (value) => {
      expect(readSelfHost(value)).toEqual({ on: false, unrecognized: value });
    },
  );
});

describe("isSelfHost", () => {
  const original = process.env.SELF_HOST;
  afterEach(() => {
    if (original === undefined) delete process.env.SELF_HOST;
    else process.env.SELF_HOST = original;
  });

  it("reads the environment on every call", () => {
    delete process.env.SELF_HOST;
    expect(isSelfHost()).toBe(false);
    process.env.SELF_HOST = "Yes";
    expect(isSelfHost()).toBe(true);
    process.env.SELF_HOST = "off";
    expect(isSelfHost()).toBe(false);
  });
});
