/**
 * The extra Postgres schemas this deployment asks for, from ENSURE_SCHEMAS
 * (comma-separated). Used by migrate-deploy.js so a stack that shares this
 * database with another program (bex shares it with Gitea) gets that program's
 * schema created, instead of an operator running SQL by hand before first boot.
 *
 * Names are interpolated into DDL, so anything that is not a plain lowercase
 * identifier is refused rather than quoted.
 *
 * Plain CommonJS on purpose, like the script that uses it.
 */
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

function schemaNames(value) {
  const names = String(value || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of names) {
    if (!IDENTIFIER.test(name)) {
      throw new Error(
        `ENSURE_SCHEMAS: ${JSON.stringify(name)} is not a plain lowercase schema name`,
      );
    }
  }
  return [...new Set(names)];
}

module.exports = { schemaNames };
