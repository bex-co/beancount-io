import { z } from "@/shared/zod-openapi-setup";

export const errorResponseSchema = z
  .object({
    ok: z.literal(false).openapi({ description: "Indicates request failed" }),
    error: z.object({
      code: z
        .string()
        .openapi({ description: "Error code", example: "UNAUTHORIZED" }),
      message: z.string().openapi({
        description: "Human-readable error message",
        example: "invalid api token",
      }),
    }),
  })
  .openapi("ErrorResponse");
