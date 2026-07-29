import { createIsomorphicFn } from "@tanstack/react-start";
import { detectLanguageOnServer } from "./server";
import { detectLanguageOnClient } from "./client";

/**
 * Isomorphic language detector with no parameters.
 * Reads the current request URL + cookies on the server.
 *
 * - Server: URL param (?lang=zh) > cookie (i18nextLng) > "en"
 * - Client: returns "en" (SSR injection + LangQuerySync handle the client)
 */
export const detectLanguage = createIsomorphicFn()
  .client(detectLanguageOnClient)
  .server(detectLanguageOnServer);
