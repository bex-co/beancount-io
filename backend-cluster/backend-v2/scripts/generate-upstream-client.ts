import { resolve } from "node:path";
import { generateApi } from "swagger-typescript-api";

const target = process.argv[2];
if (target !== "fava" && target !== "gitea") {
  throw new Error("Usage: generate-upstream-client.ts <fava|gitea>");
}

const clients = {
  fava: {
    input: "../../idl/beancount-ledger.openapi.json",
    output: "../src/foundation/fava",
    fileName: "Api.ts",
  },
  gitea: {
    input: "../../idl/gitea.swagger.v1.json",
    output: "../src/features/gitea/client",
    fileName: "gitea-api.ts",
  },
};
const client = clients[target];

const MULTI_SEGMENT_PATH_PARAMS = new Set([
  "filepath",
  "branch",
  "ref",
  "basehead",
]);

generateApi({
  ...client,
  input: resolve(__dirname, client.input),
  output: resolve(__dirname, client.output),
  hooks: {
    // Every path parameter is one encoded segment, so a value cannot add
    // segments, a query or a fragment to the upstream URL. Gitea's wildcard
    // routes are the exception: their parameters span slashes by design
    // (a file path, a branch or ref name, `base...head`), and the services
    // validate those values before calling.
    onInsertPathParam: (name) =>
      MULTI_SEGMENT_PATH_PARAMS.has(name) ? name : `encodeURIComponent(${name})`,
  },
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
