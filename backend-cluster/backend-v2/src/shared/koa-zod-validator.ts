import Router, { RouterContext } from "@koa/router";
import z from "zod";
import { CATEGORY_HTTP_STATUS, ErrorCategory } from "@/shared/errors";

export function zodValidator<T>(schema: z.ZodSchema<T>): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    try {
      const validatedBody = schema.parse(ctx.request.body);
      ctx.request.body = validatedBody; // Replace with validated data
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ctx.status = CATEGORY_HTTP_STATUS[ErrorCategory.BAD_USER_INPUT];
        const message = `Invalid input data ${error.issues[0].path}`;
        ctx.body = {
          ok: false,
          error: {
            code: ErrorCategory.BAD_USER_INPUT,
            message,
            details: error.issues[0].path,
          },
        };
        return;
      }
      throw error;
    }
  };
}
