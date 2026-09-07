import { z } from "zod";
import {
  publicKeyCreateInput,
  publicKeyDeleteInput,
  publicKeySchema,
} from "@/features/ledger/api/rest/v1/public-keys-handler";
import type { McpRequestContext } from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";

export const publicKeyToolInput = z
  .object({
    operation: z.enum(["create", "delete"]),
    key: z
      .string()
      .optional()
      .describe("SSH public key text. Required only for create."),
    title: z
      .string()
      .optional()
      .describe("Key title. Required only for create."),
    readOnly: z
      .boolean()
      .nullable()
      .optional()
      .describe("Only for create; defaults to false."),
    keyId: z
      .number()
      .optional()
      .describe("Key identifier. Required only for delete."),
  })
  .strict();
export const publicKeyToolOutput = mcpOutputSchema(
  toolOutputSchema(z.union([publicKeySchema, z.object({ id: z.number() })])),
);
export async function executePublicKeyTool(
  context: McpRequestContext,
  input: z.infer<typeof publicKeyToolInput>,
) {
  const { operation, ...payload } = publicKeyToolInput.parse(input);
  const service = context.publicKeyService;
  if (operation === "create") {
    const data = publicKeyCreateInput.parse(payload);
    return {
      ok: true,
      result: await service.createPublicKey(context.identity, {
        ...data,
        readOnly: data.readOnly ?? undefined,
      }),
    };
  }
  const { keyId } = publicKeyDeleteInput.parse(payload);
  return {
    ok: true,
    result: await service.deletePublicKey(context.identity, keyId),
  };
}
