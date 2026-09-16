import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AgentPageImpl } from "../page";

const sendMessage = vi.fn();
const useSearchMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "book" }),
  useSearch: () => useSearchMock(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage,
    status: "ready",
    stop: vi.fn(),
    error: null,
    regenerate: vi.fn(),
    addToolApprovalResponse: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.ledgerName ? `${key}:${params.ledgerName}` : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
  getErrorMessageKey: () => null,
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

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
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

vi.mock("@/features/importer/hooks/use-temp-asset-upload", () => ({
  useTempAssetUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../use-temp-asset-download-url", () => ({
  useTempAssetDownloadUrl: () => ({ fetchDownloadUrl: vi.fn() }),
}));

describe("AgentPageImpl deep links", () => {
  beforeEach(() => {
    sendMessage.mockClear();
  });

  it("prefills the composer from q without auto-submitting", () => {
    useSearchMock.mockReturnValue({ q: "  What is my burn rate?  " });

    render(<AgentPageImpl />);

    expect(screen.getByLabelText("aiAgent.placeholder")).toHaveValue(
      "What is my burn rate?",
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("leaves the composer empty when q is missing or blank", () => {
    useSearchMock.mockReturnValue({ q: "   " });

    render(<AgentPageImpl />);

    expect(screen.getByLabelText("aiAgent.placeholder")).toHaveValue("");
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
