/**
 * Custom schema loader for GraphQL Code Generator.
 *
 * The API gateway reports @deprecated with a `DIRECTIVE_DEFINITION` location
 * in introspection. That location is not part of the GraphQL spec enum that
 * graphql-js parses, so codegen crashes with
 * `Syntax Error: Unexpected Name "DIRECTIVE_DEFINITION"` when it re-prints and
 * re-parses the schema's directive definitions. Drop any directive location
 * graphql-js does not recognize before handing the schema to codegen.
 */
const { UrlLoader } = require("@graphql-tools/url-loader");
const { DirectiveLocation } = require("graphql");

module.exports = async function loadSanitizedSchema(pointer, options) {
  const [source] = await new UrlLoader().load(pointer, options);
  const schema = source && source.schema;
  if (schema) {
    for (const directive of schema.getDirectives()) {
      directive.locations = directive.locations.filter(
        (location) => location in DirectiveLocation,
      );
    }
  }
  return schema;
};
