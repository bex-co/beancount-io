import { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError, Kind, OperationDefinitionNode } from "graphql";
import {
  graphqlQueryDuration,
  graphqlQueryTotal,
  graphqlQueryInProgress,
} from "./metrics-definitions";
import { boundedLabel, OVERFLOW_LABEL } from "./cardinality-control";
import { FIRST_PARTY_OPERATION_NAMES } from "./first-party-operations";
import { DomainError } from "@/shared/errors";

// Extend the context type to include metrics properties
interface MetricsContext {
  _metricsStartTime?: number;
  _metricsOperationName?: string;
  _metricsOperationType?: string;
}

/**
 * Distinct `operation_name` values recorded besides the first-party names.
 * Root fields are what fills it, and the schema has about 160 today.
 */
const MAX_OTHER_OPERATION_LABELS = 500;
const otherOperationLabel = boundedLabel(MAX_OTHER_OPERATION_LABELS);

/**
 * The `operation_name` label for a resolved operation.
 *
 * A name a first-party client defines is recorded as is. Any other operation is
 * labelled by its first root field, which validation has already checked
 * against the schema. An operation with neither is `Anonymous` when it sent no
 * name and `Other` when it did. Values beyond the first-party names are capped.
 */
function operationNameLabel(
  operationName: string | null | undefined,
  operation: OperationDefinitionNode | undefined,
): string {
  if (operationName && FIRST_PARTY_OPERATION_NAMES.has(operationName)) {
    return operationName;
  }
  const fieldName = extractFirstFieldName(operation);
  return otherOperationLabel(
    fieldName ?? (operationName ? OVERFLOW_LABEL : "Anonymous"),
  );
}

/**
 * Extract the first field name from a GraphQL operation
 * Used to label operations that are not first-party
 */
function extractFirstFieldName(
  operation: OperationDefinitionNode | undefined,
): string | null {
  if (!operation?.selectionSet?.selections) {
    return null;
  }

  const firstSelection = operation.selectionSet.selections[0];
  if (!firstSelection) {
    return null;
  }

  // Handle Field nodes (most common)
  if (firstSelection.kind === Kind.FIELD) {
    return firstSelection.name.value;
  }

  // Handle FragmentSpread and InlineFragment (less common)
  // For these cases, we can't easily extract a single field name
  return null;
}

/**
 * Classify GraphQL result status based on errors
 * Returns the error code directly for metrics tracking
 */
function classifyGraphQLStatus(errors?: readonly GraphQLError[]): string {
  if (!errors || errors.length === 0) {
    return "success";
  }

  // Check the first error for classification
  const error = errors[0];

  // Prefer the thrown DomainError's category (the wrapping GraphQLError carries it
  // as originalError); fall back to the code on the formatted error's extensions.
  if (error.originalError instanceof DomainError) {
    return error.originalError.category;
  }

  const code = error.extensions?.code as string | undefined;
  return code || "unknown_error";
}

export const apolloMetricsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation(requestContext) {
        const operationType = requestContext.operation?.operation || "unknown";
        const operationName = operationNameLabel(
          requestContext.request.operationName,
          requestContext.operation,
        );

        // Increment in-progress queries
        graphqlQueryInProgress.inc();

        // Store start time and operation info in context
        const context = requestContext.contextValue as MetricsContext;
        context._metricsStartTime = Date.now();
        context._metricsOperationName = operationName;
        context._metricsOperationType = operationType;
      },

      async willSendResponse(requestContext) {
        const context = requestContext.contextValue as MetricsContext;
        const startTime = context._metricsStartTime;
        const operationName = context._metricsOperationName ?? "Anonymous";

        if (startTime) {
          const duration = (Date.now() - startTime) / 1000;

          // Determine status based on errors in response
          const status = classifyGraphQLStatus(requestContext.errors);

          // Record query duration
          graphqlQueryDuration.observe(
            { operation_name: operationName },
            duration,
          );

          // Record query total with status
          graphqlQueryTotal.inc({
            operation_name: operationName,
            status: status,
          });
        }

        // Decrement in-progress queries
        graphqlQueryInProgress.dec();
      },

      async didEncounterErrors(_requestContext) {
        // Note: Metrics are recorded in willSendResponse (which is always called)
        // This hook is kept for potential future error-specific logic
        // No action needed here to avoid double-counting
      },
    };
  },
};
