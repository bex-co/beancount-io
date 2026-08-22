import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

/**
 * Zod OpenAPI Setup
 *
 * This file extends Zod with OpenAPI functionality from @asteasolutions/zod-to-openapi.
 * According to the library's best practices, extendZodWithOpenApi should be called
 * ONCE at application startup in a common entry point.
 *
 * This file is imported at the top of server.ts to ensure the extension happens
 * before any schema files are loaded.
 *
 * @see https://github.com/asteasolutions/zod-to-openapi
 */
extendZodWithOpenApi(z);

// Re-export z for convenience so other files can import from here
export { z };
