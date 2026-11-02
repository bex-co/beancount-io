import fs from "fs";
import path from "path";
import { previewFailureKind } from "../ledger-name";

// w21/105: on Review, a name conflict or an invalid opening amount stopped the
// spinner and showed nothing, because both errors render on the form step.
describe("Create Ledger's Review step", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "create-ledger-screen.tsx"),
    "utf8",
  );

  it("validates the purpose step's field on Next and every field on Create", () => {
    expect(
      source.includes('if (!(await trigger("propertyName"))) return;'),
    ).toBe(true);
    // Create submits through handleSubmit, which checks the whole form.
    expect(source.includes("const onSubmit = handleSubmit(")).toBe(true);
    expect(source.includes('trigger("name")')).toBe(false);
  });

  it("returns to the form step on a refused name or an invalid field", () => {
    const conflict = source.indexOf(
      'setError("name", { message: t("createLedgerNameConflict") });',
    );
    expect(conflict > 0).toBe(true);
    expect(
      source.slice(conflict, conflict + 200).includes("setStep(FORM_STEP);"),
    ).toBe(true);
    expect(source.includes("    () => setStep(FORM_STEP),")).toBe(true);
    expect(source.includes("const FORM_STEP = 1;")).toBe(true);
  });
});

// w21/478: a failed preview showed the raw English transport text, offered no
// way to try again and left Create enabled.
describe("Create Ledger's preview failure", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "create-ledger-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");
  const withCode = (code: string) => ({
    message: "Validation failed for setup: Unsupported operating currency",
    graphQLErrors: [{ extensions: { code } }],
  });

  it("calls a server refusal refused, and anything else unreachable", () => {
    expect(previewFailureKind(withCode("BAD_USER_INPUT"))).toBe("refused");
    expect(previewFailureKind(withCode("VALIDATION_FAILED"))).toBe("refused");
    expect(previewFailureKind(withCode("SERVICE_UNAVAILABLE"))).toBe(
      "unreachable",
    );
    expect(
      previewFailureKind({ networkError: new Error("Network request failed") }),
    ).toBe("unreachable");
    expect(previewFailureKind(new Error("Received status code 502"))).toBe(
      "unreachable",
    );
    expect(previewFailureKind(null)).toBe("unreachable");
  });

  it("shows a translated failure with a retry, and the server's words only for a refusal", () => {
    expect(
      source.includes(
        'previewFailureKind(previewError)==="refused"?(<InlineErrorstyle={styles.error}message={previewError.message}/>):previewFailureKind(previewError)==="unsupported"?null:(<><InlineErrorstyle={styles.error}message={t("ledgerLoadError")}/><PressableonPress={retryPreview}accessibilityRole="button"hitSlop={8}><Textstyle={styles.retry}>{t("discoveryRetry")}</Text></Pressable></>)',
      ),
    ).toBe(true);
    expect(
      source.includes(
        "constretryPreview=()=>{constsetup=buildSetup(getValues());if(setup)voidrunPreview({variables:{setup}});};",
      ),
    ).toBe(true);
  });

  // w21/511: Create worked while the preview was loading, and looked enabled
  // after it failed.
  it("holds Create while the preview loads or has failed, and dims it", () => {
    expect(
      source.includes(
        'constpreviewBlocked=startKind==="preset"&&(previewLoading||Boolean(previewError));',
      ),
    ).toBe(true);
    expect(
      source.includes(
        "constcreateDisabled=busy||(step===FORM_STEP&&previewBlocked&&!serverDefaults);",
      ),
    ).toBe(true);
    expect(source.includes("disabled={createDisabled}")).toBe(true);
    expect(
      source.includes("createDisabled?styles.doneButtonDisabled:null"),
    ).toBe(true);
  });
});
