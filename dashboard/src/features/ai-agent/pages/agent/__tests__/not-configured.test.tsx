/**
 * A deployment without an LLM key answers the agent POST with 503
 * CONFIGURATION_ERROR before streaming; the AI SDK throws the body text as
 * the error's message. The page keeps the server's message and operator hint
 * on screen and offers no Try Again, which would be refused the same way.
 * The real error formatter runs.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentPageImpl } from "../page";

const sendMessage = vi.fn();
const regenerate = vi.fn();
const chat = vi.hoisted(() => ({ error: null as Error | null }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "book" }),
  useSearch: () => ({}),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage,
    status: "ready",
    stop: vi.fn(),
    error: chat.error,
    regenerate,
    addToolApprovalResponse: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerDisplayName: "Demo Books" }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));

vi.mock("@/features/ai-agent/hooks/use-agent-session", () => ({
  useAgentSession: () => ({ sessionId: "session-1" }),
}));

vi.mock("@/common/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/common/components/ai-cfo-upgrade-panel", () => ({
  AiCfoUpgradePanel: () => null,
}));

vi.mock("../agent-chat-input", () => ({
  AgentChatInput: ({
    value,
    placeholder,
  }: {
    value: string;
    placeholder: string;
  }) => <textarea aria-label={placeholder} readOnly value={value} />,
}));

vi.mock("../agent-message-list", () => ({
  AgentMessageList: () => null,
}));

vi.mock("@/common/hooks/use-temp-asset-upload", () => ({
  useTempAssetUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../use-temp-asset-download-url", () => ({
  useTempAssetDownloadUrl: () => ({ fetchDownloadUrl: vi.fn() }),
}));

const HINT = "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)";

describe("AgentPageImpl on a deployment with no AI model", () => {
  it("shows the operator hint with no Try Again", () => {
    chat.error = new Error(
      JSON.stringify({
        ok: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message: "LLM is not configured on this deployment",
          metadata: { hint: HINT },
        },
      }),
    );

    render(<AgentPageImpl />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      `common.errors.notConfigured LLM is not configured on this deployment. ${HINT}`,
    );
    expect(
      screen.queryByRole("button", { name: "common.tryAgain" }),
    ).toBeNull();
  });

  it("still offers Try Again for a lost connection", () => {
    chat.error = new TypeError("Failed to fetch");

    render(<AgentPageImpl />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "common.errors.network",
    );
    expect(
      screen.getByRole("button", { name: "common.tryAgain" }),
    ).toBeVisible();
  });
});
