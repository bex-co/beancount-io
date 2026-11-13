import fs from "fs";
import path from "path";

// w22/050: the selected Template row was a 1.10:1 `black10` fill with nothing
// else to see. It takes the brand-green `controlSelected` tint — itself only a
// ~1.17:1 step — so a check mark beside the text is what carries the state
// beyond colour, as on the account picker.
const source = fs
  .readFileSync(path.join(__dirname, "..", "create-ledger-screen.tsx"), "utf8")
  .replace(/\s+/g, "");

const block = (name: string): string => {
  const start = source.indexOf(`${name}:{`);
  expect(start >= 0).toBe(true);
  return source.slice(start, source.indexOf("}", start));
};

describe("the Template choice's selected state", () => {
  it("is the brand tint, not the neutral inset fill", () => {
    expect(block("templateSelected")).toBe(
      "templateSelected:{backgroundColor:theme.controlSelected,",
    );
  });

  it("gives the selected row's hint the body colour, which clears the text bar on the tint", () => {
    // `black80` is 4.43:1 on `controlSelected` in light (`text-style-contrast`
    // checks the override); each row must actually apply it when selected.
    expect(block("templateHintSelected")).toBe(
      "templateHintSelected:{color:theme.text01,",
    );
    expect(
      source.includes(
        'style={[styles.hint,value==="STARTER"?styles.templateHintSelected:null,]}',
      ),
    ).toBe(true);
    expect(
      source.includes(
        'style={[styles.hint,value==="SAMPLE"?styles.templateHintSelected:null,]}',
      ),
    ).toBe(true);
  });

  it("draws a check mark on the selected row only", () => {
    expect(
      source.includes(
        'value==="STARTER"?(<Ioniconsname="checkmark"size={24}color={theme.primary}',
      ),
    ).toBe(true);
    expect(
      source.includes(
        'value==="SAMPLE"?(<Ioniconsname="checkmark"size={24}color={theme.primary}',
      ),
    ).toBe(true);
    expect((source.match(/name="checkmark"/g) ?? []).length).toBe(2);
  });

  it("hides the mark from VoiceOver, which already hears `selected`", () => {
    expect(
      (
        source.match(
          /name="checkmark"[^>]*accessible=\{false\}importantForAccessibility="no"accessibilityElementsHidden/g,
        ) ?? []
      ).length,
    ).toBe(2);
    expect(
      source.includes('accessibilityState={{selected:value==="STARTER"}}'),
    ).toBe(true);
    expect(
      source.includes('accessibilityState={{selected:value==="SAMPLE"}}'),
    ).toBe(true);
  });

  it("reserves the mark's slot on both rows, so choosing one rewraps nothing", () => {
    // The slot is always rendered; only the icon inside it is conditional.
    expect(
      source.includes('<Viewstyle={styles.templateCheck}>{value==="STARTER"?'),
    ).toBe(true);
    expect(
      source.includes('<Viewstyle={styles.templateCheck}>{value==="SAMPLE"?'),
    ).toBe(true);
    expect(block("templateCheck").includes("width:24")).toBe(true);
  });
});
