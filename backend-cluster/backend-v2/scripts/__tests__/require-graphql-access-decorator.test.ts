import { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";
import { requireGraphqlAccessDecorator } from "../eslint-rules/require-graphql-access-decorator";

const ruleName = "beancount-io/require-graphql-access-decorator";
const linter = new Linter();
// ESLint 9 and typescript-eslint 8 publish structurally compatible runtime
// plugin contracts through different type packages. Keep the cast at this
// test/config seam rather than weakening the rule's typed AST implementation.
const plugin = {
  rules: {
    "require-graphql-access-decorator": requireGraphqlAccessDecorator,
  },
} as unknown as ESLint.Plugin;
const config: Linter.Config = {
  files: ["**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  plugins: {
    "beancount-io": plugin,
  },
  rules: { [ruleName]: "error" },
};

function lint(code: string): Linter.LintMessage[] {
  return linter.verify(code, config, "resolver.ts");
}

describe("require-graphql-access-decorator", () => {
  it.each(["Authenticated", "AllowAnonymous"])(
    "accepts @%s() on a root resolver method",
    (accessDecorator) => {
      expect(
        lint(`
          class Resolver {
            @${accessDecorator}()
            @Query(() => String)
            async value(): Promise<string> { return "ok"; }
          }
        `),
      ).toEqual([]);
    },
  );

  it.each(["Query", "Mutation", "Subscription"])(
    "rejects an unmarked @%s() resolver method",
    (rootDecorator) => {
      expect(
        lint(`
          class Resolver {
            @${rootDecorator}(() => String)
            async value(): Promise<string> { return "ok"; }
          }
        `).map((message) => message.messageId),
      ).toEqual(["missingAccess"]);
    },
  );

  it("rejects conflicting access decorators", () => {
    expect(
      lint(`
        class Resolver {
          @Authenticated()
          @AllowAnonymous()
          @Query(() => String)
          value(): string { return "ok"; }
        }
      `).map((message) => message.messageId),
    ).toEqual(["conflictingAccess"]);
  });

  it("does not accept legacy @Authorized() as an access marker", () => {
    expect(
      lint(`
        class Resolver {
          @Authorized("ledger.read")
          @Query(() => String)
          value(): string { return "ok"; }
        }
      `).map((message) => message.messageId),
    ).toEqual(["missingAccess"]);
  });

  it("requires the access marker on the resolver method", () => {
    expect(
      lint(`
        @Authenticated()
        class Resolver {
          @Query(() => String)
          value(): string { return "ok"; }
        }
      `).map((message) => message.messageId),
    ).toEqual(["missingAccess"]);
  });

  it("ignores nested field resolvers", () => {
    expect(
      lint(`
        class Resolver {
          @FieldResolver(() => String)
          value(): string { return "ok"; }
        }
      `),
    ).toEqual([]);
  });
});
