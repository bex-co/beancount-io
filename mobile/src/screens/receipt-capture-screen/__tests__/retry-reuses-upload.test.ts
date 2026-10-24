import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

/**
 * w21/956: Try Again after a failed parse sent the whole photo again, though it
 * had reached storage. Runs the real hook with React, the file system and the
 * mutations stubbed, and counts the calls.
 */
const calls: string[] = [];
let parseOutcomes: Array<"fail" | "ok"> = [];
let phase: { kind: string; message?: string } = { kind: "idle" };

const refs: Array<{ current: unknown }> = [];
let refIndex = 0;

const hookExports: Record<string, any> = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "use-receipt-workflow.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  {
    exports: hookExports,
    setTimeout,
    clearTimeout,
    AbortController,
    Promise,
    Error,
    require: (id: string) => {
      const modules: Record<string, unknown> = {
        react: {
          useState: (initial: unknown) => [
            initial,
            (next: typeof phase) => {
              phase = next;
            },
          ],
          useCallback: (fn: unknown) => fn,
          useEffect: () => undefined,
          useRef: (initial: unknown) => {
            refs[refIndex] ??= { current: initial };
            return refs[refIndex++];
          },
        },
        "react-native": {
          AppState: { addEventListener: () => ({ remove: () => undefined }) },
        },
        "expo-file-system/legacy": {
          FileSystemUploadType: { BINARY_CONTENT: 0 },
          createUploadTask: () => ({
            uploadAsync: async () => {
              calls.push("put");
              return { status: 200 };
            },
            cancelAsync: async () => undefined,
          }),
        },
        "@/generated-graphql/graphql": {
          useGenerateTempAssetUploadUrlMutation: () => [
            async () => {
              calls.push("mint");
              return {
                data: {
                  generateTempAssetUploadUrl: {
                    uploadUrl: "https://s3/put",
                    objectKey: `tmp/obj${calls.length}`,
                  },
                },
              };
            },
          ],
          useParseReceiptMutation: () => [
            async (options: { variables: { s3ObjectKey: string } }) => {
              calls.push(`parse ${options.variables.s3ObjectKey}`);
              if (parseOutcomes.shift() === "fail") {
                throw new Error("Network request failed");
              }
              return {
                data: {
                  parseReceipt: {
                    date: "2026-10-20",
                    payee: "Cafe",
                    description: "latte",
                    amount: 4.5,
                  },
                },
              };
            },
          ],
        },
        "./receipt-utils": {
          receiptDate: (value: string) => value,
          parseErrorCode: () => "parse_failed",
          isPermanentReceiptRefusal: () => false,
        },
        "@/common/sentry/capture": { captureError: () => undefined },
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        "./upload-guard": require("../upload-guard"),
      };
      if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
      return modules[id];
    },
  },
);

const mount = () => {
  refIndex = 0;
  return hookExports.useReceiptWorkflow();
};

describe("Try Again after a failed parse", () => {
  beforeEach(() => {
    calls.length = 0;
    refs.length = 0;
    phase = { kind: "idle" };
  });

  it("parses the stored photo again, with no new upload", async () => {
    parseOutcomes = ["fail", "ok"];
    const workflow = mount();
    await workflow.startCapture("file:///a.jpg", "image/jpeg", "a.jpg", "L");
    expect(phase.kind).toBe("error");
    await workflow.startCapture("file:///a.jpg", "image/jpeg", "a.jpg", "L");
    expect(phase.kind).toBe("parsed");
    expect(calls).toEqual(["mint", "put", "parse tmp/obj1", "parse tmp/obj1"]);
  });

  it("uploads afresh for another photo, after Retake, and after a failed reuse", async () => {
    parseOutcomes = ["fail", "ok", "fail", "fail", "ok"];
    const workflow = mount();
    await workflow.startCapture("file:///a.jpg", "image/jpeg", "a.jpg", "L");
    await workflow.startCapture("file:///b.jpg", "image/jpeg", "b.jpg", "L");
    expect(calls.filter((call) => call === "mint").length).toBe(2);
    workflow.reset();
    await workflow.startCapture("file:///b.jpg", "image/jpeg", "b.jpg", "L");
    expect(calls.filter((call) => call === "mint").length).toBe(3);
    // The reused key failed again: the next try uploads.
    await workflow.startCapture("file:///b.jpg", "image/jpeg", "b.jpg", "L");
    await workflow.startCapture("file:///b.jpg", "image/jpeg", "b.jpg", "L");
    expect(calls.filter((call) => call === "mint").length).toBe(4);
  });
});
