import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

const ROOT_RESOLVER_DECORATORS = new Set(["Query", "Mutation", "Subscription"]);
const ACCESS_DECORATORS = new Set(["Authenticated", "AllowAnonymous"]);

type MessageId = "conflictingAccess" | "missingAccess";

function decoratorName(decorator: TSESTree.Decorator): string | undefined {
  const expression = decorator.expression;
  const callee =
    expression.type === "CallExpression" ? expression.callee : expression;
  return callee.type === "Identifier" ? callee.name : undefined;
}

export const requireGraphqlAccessDecorator =
  ESLintUtils.RuleCreator.withoutDocs<[], MessageId>({
    meta: {
      type: "problem",
      docs: {
        description:
          "Require every GraphQL root resolver to declare exactly one access mode",
      },
      schema: [],
      messages: {
        conflictingAccess:
          "GraphQL root resolver must use exactly one @Authenticated() or @AllowAnonymous() decorator.",
        missingAccess:
          "GraphQL root resolver must use either @Authenticated() or @AllowAnonymous().",
      },
    },
    defaultOptions: [],
    create(context) {
      return {
        MethodDefinition(node): void {
          const names = node.decorators
            .map(decoratorName)
            .filter((name): name is string => name !== undefined);

          if (!names.some((name) => ROOT_RESOLVER_DECORATORS.has(name))) return;

          const access = names.filter((name) => ACCESS_DECORATORS.has(name));
          if (access.length === 0) {
            context.report({ node, messageId: "missingAccess" });
          } else if (access.length > 1) {
            context.report({ node, messageId: "conflictingAccess" });
          }
        },
      };
    },
  });
