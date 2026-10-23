import fs from "fs";
import path from "path";
import { deviceTimeZone } from "../device-time-zone";

// w21/856: the agent was never told where the user is.
describe("deviceTimeZone", () => {
  it("is an IANA zone name or undefined, never an empty string", () => {
    const zone = deviceTimeZone();
    expect(zone === undefined || zone.length > 0).toBe(true);
  });
});

describe("the agent chat request", () => {
  it("carries the device's time zone, read for each request", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "use-agent-chat.ts"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "body:()=>({ledgerId,sessionId,timeZone:deviceTimeZone()}),",
      ),
    ).toBe(true);
  });
});
