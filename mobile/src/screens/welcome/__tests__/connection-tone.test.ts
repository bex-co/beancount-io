import fs from "fs";
import path from "path";
import { connectionTone } from "../connection-tone";

/**
 * w21/717: an older server answered, yet its result read in red with the
 * advisory for a server that is not available.
 */
describe("connectionTone", () => {
  it("reads an older server as a warning, a current one as success", () => {
    expect(connectionTone({ kind: "older" })).toBe("warning");
    expect(connectionTone({ kind: "connected" })).toBe("success");
  });

  it("reads every failure as an error", () => {
    expect(connectionTone({ kind: "timeout" })).toBe("error");
    expect(connectionTone({ kind: "unreachable" })).toBe("error");
    expect(connectionTone({ kind: "incompatible" })).toBe("error");
  });

  it("styles the result by it and keeps the advisory for failures", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "server-settings-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes('style={styles[tone??"error"]}')).toBe(true);
    expect(
      screen.includes(
        '{tone==="error"&&(<Textstyle={styles.helper}>{t("serverConnectionAdvisory")}',
      ),
    ).toBe(true);
  });
});
