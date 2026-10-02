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

generateApi({
  ...client,
  input: resolve(__dirname, client.input),
  output: resolve(__dirname, client.output),
  hooks: {
    // Ledger coordinates are single segments on every upstream endpoint.
    // Other parameters, such as Gitea's wildcard filepath, retain their
    // existing path semantics.
    onInsertPathParam: (name) =>
      ["owner", "repo", "repoName"].includes(name)
        ? `encodeURIComponent(${name})`
        : name,
  },
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
