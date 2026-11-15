import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { UploadStep } from "../index";

/**
 * A deployment without an LLM key or temporary-asset storage refuses AI
 * parsing (`parseFile`) or the upload before it (`generateTempAssetUploadUrl`)
 * as CONFIGURATION_ERROR, with a hint naming the variables to set. That read
 * as a server error to retry in a few seconds; it must name what the operator
 * has to configure and offer neither a retry nor an upgrade.
 */
const parseLLMFile = vi.fn();

vi.mock("../../../../hooks/use-llm-parser", () => ({
  useLLMParser: () => ({ parseFile: parseLLMFile }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ tier: "FREE" }),
}));

const notConfigured = (message: string, hint: string) =>
  new CombinedGraphQLErrors({
    errors: [{ message, extensions: { code: "CONFIGURATION_ERROR", hint } }],
  });

function uploadPdf(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("file input missing");
  fireEvent.change(input, {
    target: {
      files: [
        new File(["%PDF-1.7"], "statement.pdf", { type: "application/pdf" }),
      ],
    },
  });
}

describe("UploadStep on an unconfigured deployment", () => {
  beforeEach(() => {
    parseLLMFile.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [
      "AI parsing",
      "LLM is not configured on this deployment",
      "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)",
    ],
    [
      "the file upload",
      "Object storage is not configured on this deployment",
      "Set TEMP_ASSETS_AWS_S3_BUCKET, TEMP_ASSETS_AWS_S3_ACCESS_KEY_ID, and TEMP_ASSETS_AWS_S3_SECRET_ACCESS_KEY (see .env.example)",
    ],
  ])(
    "names the operator hint when %s is not set up, with no retry or upgrade",
    async (_, message, hint) => {
      parseLLMFile.mockRejectedValue(notConfigured(message, hint));
      const { container } = render(<UploadStep onParseComplete={vi.fn()} />);

      uploadPdf(container);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("common.errors.notConfigured");
      expect(alert).toHaveTextContent(`${message}. ${hint}`);
      expect(screen.queryByText("importer.error.serverError")).toBeNull();
      expect(screen.queryByText("importer.error.premiumRequired")).toBeNull();
      expect(screen.queryByText("importer.error.upgradeNow")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      // Only the way back to the picker remains.
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(
        screen.getByRole("button", {
          name: "importer.error.uploadDifferentFile",
        }),
      ).toBeVisible();
    },
  );
});
