import fs from "fs";
import path from "path";
import { runAccountDeletion } from "../delete-account";

describe("runAccountDeletion", () => {
  it("signs out only after the server confirms the deletion", async () => {
    const calls: string[] = [];
    const outcome = await runAccountDeletion({
      deleteAccount: async () => {
        calls.push("delete");
        return true;
      },
      signOut: async () => {
        calls.push("signOut");
      },
    });
    expect(outcome).toBe("deleted");
    expect(calls).toEqual(["delete", "signOut"]);
  });

  it("reports a refused deletion as failed and keeps the session", async () => {
    let signedOut = false;
    const outcome = await runAccountDeletion({
      deleteAccount: async () => false,
      signOut: async () => {
        signedOut = true;
      },
    });
    expect(outcome).toBe("failed");
    expect(signedOut).toBe(false);
  });

  it("reports a failed request as failed and keeps the session", async () => {
    let signedOut = false;
    const outcome = await runAccountDeletion({
      deleteAccount: async () => {
        throw new Error("Network request failed");
      },
      signOut: async () => {
        signedOut = true;
      },
    });
    expect(outcome).toBe("failed");
    expect(signedOut).toBe(false);
  });
});

/**
 * Static guardrail over Settings, which the unit runner cannot render: the
 * deletion's messages are translated, and a failure is reported through a
 * native alert rather than only a toast.
 */
describe("Settings delete-account wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "main-content.tsx"),
    "utf8",
  );

  it("uses translated messages, with no literal English left", () => {
    expect(source.includes('message: "')).toBe(false);
    expect(source.includes('t("deleteAccountSuccess")')).toBe(true);
  });

  it("reports a failure in a native alert and shows progress on the row", () => {
    expect(source.includes('Alert.alert("", t("deleteAccountFailed"))')).toBe(
      true,
    );
    expect(source.includes('t("deleteAccountInProgress")')).toBe(true);
  });
});
