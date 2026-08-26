/**
 * Schema-file loader for GraphQL Code Generator, used when
 * CODEGEN_SCHEMA_FILE is set (see codegen.ts).
 *
 * Loading the SDL through codegen's default file pipeline breaks a schema
 * that has a plain object type NAMED "Subscription" (this API does — the
 * Stripe subscription): @graphql-tools/merge "completes" the schema
 * definition with conventional root names and turns it into the root
 * subscription type, which drops __typename from generated operation types.
 * Building the schema here and returning it directly bypasses the merge
 * (loadSchema returns a single source's schema untouched).
 */
const { readFileSync } = require("fs");
const { buildSchema } = require("graphql");

module.exports = async function loadSchemaFromFile(pointer) {
  return buildSchema(readFileSync(pointer, "utf8"));
};
