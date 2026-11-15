import { describe, expect, it } from "vitest";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import {
  configurationErrorDetail,
  getConfigurationError,
} from "../configuration-error";
import { getErrorMessageKey } from "../error-message";

const LLM = {
  message: "LLM is not configured on this deployment",
  hint: "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)",
};

const envelope = (code: string) => ({
  ok: false,
  error: { code, message: LLM.message, metadata: { hint: LLM.hint } },
});

const serverError = (status: number, body: unknown) =>
  new ServerError("Response not successful", {
    response: new Response(null, { status }),
    bodyText: JSON.stringify(body),
  });

describe("getConfigurationError", () => {
  it("reads the GraphQL refusal's message and extensions.hint", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: LLM.message,
          extensions: { code: "CONFIGURATION_ERROR", hint: LLM.hint },
        },
      ],
    });
    expect(getConfigurationError(error)).toEqual(LLM);
  });

  it("reads the REST envelope, parsed, as an Error's text, or a 503 body", () => {
    const body = envelope("CONFIGURATION_ERROR");
    expect(getConfigurationError(body)).toEqual(LLM);
    expect(getConfigurationError(new Error(JSON.stringify(body)))).toEqual(LLM);
    expect(getConfigurationError(serverError(503, body))).toEqual(LLM);
  });

  it("is null for every other refusal, including SERVICE_UNAVAILABLE", () => {
    expect(
      getConfigurationError(serverError(503, envelope("SERVICE_UNAVAILABLE"))),
    ).toBeNull();
    expect(
      getConfigurationError(
        new CombinedGraphQLErrors({
          errors: [{ message: "x", extensions: { code: "FORBIDDEN" } }],
        }),
      ),
    ).toBeNull();
    expect(getConfigurationError(new Error("HTTP 500"))).toBeNull();
    expect(getConfigurationError(new Error("{not json"))).toBeNull();
    expect(getConfigurationError(null)).toBeNull();
  });

  it("keeps the hint verbatim after the message", () => {
    expect(configurationErrorDetail(LLM)).toBe(`${LLM.message}. ${LLM.hint}`);
    expect(configurationErrorDetail({ message: "Not set up." })).toBe(
      "Not set up.",
    );
  });
});

describe("getErrorMessageKey for CONFIGURATION_ERROR", () => {
  it("never reads a configuration 503 as a passing outage", () => {
    expect(
      getErrorMessageKey(serverError(503, envelope("CONFIGURATION_ERROR"))),
    ).toBe("common.errors.notConfigured");
    expect(
      getErrorMessageKey(serverError(503, envelope("SERVICE_UNAVAILABLE"))),
    ).toBe("common.errors.serviceUnavailable");
  });
});
