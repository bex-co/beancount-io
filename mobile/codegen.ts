import type { CodegenConfig } from "@graphql-codegen/cli";

const schema =
  (process.env.EXPO_PUBLIC_SERVER_URL &&
    process.env.EXPO_PUBLIC_SERVER_URL + "api-gateway/") ||
  "https://beancount.io/api-gateway/";

const scalars = {
  JSONObject: "Record<string, number | string>",
};

// codegen v6 change: `typescript-operations` now re-emits every input object /
// enum used by an operation, which collides with the `typescript` plugin when
// both write to one file (duplicate identifiers). The supported fix is to emit
// schema types into their own module (`types.ts`) and point the operations
// plugin at it via `importSchemaTypesFrom`. The `add` plugin re-exports those
// types from `graphql.tsx` so the public import path (`@/generated-graphql/
// graphql`) still exposes both schema and operation types.
const config: CodegenConfig = {
  overwrite: true,
  schema,
  documents: "src/common/graphql/**/*.graphql",
  generates: {
    "src/generated-graphql/types.ts": {
      plugins: ["typescript"],
      config: { scalars },
    },
    "src/generated-graphql/graphql.tsx": {
      plugins: [
        { add: { content: 'export * from "./types";' } },
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        scalars,
        // Resolved relative to cwd, then re-relativized against the output
        // file — this path yields `import * as Types from "./types"`.
        importSchemaTypesFrom: "src/generated-graphql/types",
        emitLegacyCommonJSImports: true,
      },
    },
    "src/generated-graphql/graphql.schema.json": {
      plugins: ["introspection"],
    },
    "src/generated-graphql/schema.graphql": {
      plugins: ["schema-ast"],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
