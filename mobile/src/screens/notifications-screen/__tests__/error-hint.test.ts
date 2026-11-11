import fs from "fs";
import path from "path";
import {
  errorHint,
  errorMessageWithHint,
} from "../../../common/new-ledger-error";
import { errorCopyText, errorSpokenText } from "../formatting";

// w21/424: the ledger service's fix hints reach GraphQL, but the app selected
// only filename, lineno and message and never showed them.
const error = {
  message: 'Unknown plugin "fava.plugin.x"',
  filename: "main.bean",
  lineno: 4,
  hint: 'Did you mean "fava.plugins.x"?',
};
const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, "../../..", ...parts), "utf8");
const squash = (text: string) => text.replace(/\s+/g, "");

describe("an error's fix hint", () => {
  it("is the trimmed hint, or null when the engine gave none", () => {
    expect(errorHint(error)).toBe('Did you mean "fava.plugins.x"?');
    expect(errorHint({ hint: "  " })).toBe(null);
    expect(errorHint({ hint: null })).toBe(null);
    expect(errorHint({})).toBe(null);
  });

  it("is read and copied with the message, before the place", () => {
    expect(errorMessageWithHint(error)).toBe(
      'Unknown plugin "fava.plugin.x". Did you mean "fava.plugins.x"?',
    );
    expect(errorSpokenText(error)).toBe(
      'Unknown plugin "fava.plugin.x". Did you mean "fava.plugins.x"?. main.bean:4',
    );
    expect(errorCopyText(error)).toBe(
      'Unknown plugin "fava.plugin.x"\nDid you mean "fava.plugins.x"?\nmain.bean:4',
    );
  });

  it("leaves an error without a hint as it was", () => {
    const plain = {
      message: "Balance failed",
      filename: "main.bean",
      lineno: 2,
    };
    expect(errorSpokenText(plain)).toBe("Balance failed. main.bean:2");
    expect(errorCopyText(plain)).toBe("Balance failed\nmain.bean:2");
  });

  it("is selected by the query and drawn in both lists", () => {
    const query = squash(
      read("common/graphql/queries/getLedgerErrors.graphql"),
    );
    expect(query.includes("message code hint".replace(/\s+/g, ""))).toBe(true);
    expect(
      squash(
        read("screens/notifications-screen/notifications-screen.tsx"),
      ).includes(
        "<Textkey={`error-hint-${fontScale}`}style={styles.errorHint}>{errorHint(err)}</Text>",
      ),
    ).toBe(true);
    const editor = squash(read("screens/ledger-file-editor-screen/index.tsx"));
    expect(
      editor.includes("<Textstyle={styles.errorHint}>{errorHint(err)}</Text>"),
    ).toBe(true);
    expect(editor.includes("errorMessageWithHint(err)")).toBe(true);
  });
});
