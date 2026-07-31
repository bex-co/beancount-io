import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AskAIPage from "../index";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
    useSearch: () => ({}),
  };
});

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerDisplayName: "Alice's Books" }),
}));

vi.mock("@/common/components/ai-cfo-upgrade-panel", () => ({
  AiCfoUpgradePanel: () => null,
}));

const encoder = new TextEncoder();

/** A completed SSE response carrying the given events. */
function sseResponse(events: object[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
        controller.close();
      },
    }),
    { status: 200 },
  );
}

function finalAnswerResponse(answer: string): Response {
  return sseResponse([{ metadata: { logs: answer } }]);
}

/** An SSE stream that emits one status event then hangs until the request is aborted. */
function hangingStreamImplementation(
  _url: unknown,
  init?: RequestInit,
): Promise<Response> {
  const signal = init?.signal;
  return Promise.resolve(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: "Working on it..." })}\n\n`,
            ),
          );
          signal?.addEventListener("abort", () => {
            controller.error(new DOMException("Aborted", "AbortError"));
          });
        },
      }),
      { status: 200 },
    ),
  );
}

function typeAndSubmit(question: string) {
  const textarea = screen.getByRole("textbox");
  fireEvent.change(textarea, { target: { value: question } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
}

function lastFetchBody(): { messages: { content: string }[] } {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const init = calls[calls.length - 1][1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe("AskAIPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows suggestion chips in the empty state", () => {
    render(<AskAIPage />);
    expect(screen.getByText("Try asking:")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a suggestion chip's question and hides the chips", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      finalAnswerResponse("Your dining spend was $42 last month."),
    );
    render(<AskAIPage />);

    const chips = screen
      .getAllByRole("button")
      .filter((b) => b.textContent && b.textContent.length > 10);
    expect(chips.length).toBeGreaterThan(0);
    const question = chips[0].textContent!;
    fireEvent.click(chips[0]);

    await screen.findByText(/dining spend was \$42/);
    expect(lastFetchBody().messages[0].content).toBe(question);
    expect(screen.queryByText("Try asking:")).not.toBeInTheDocument();
  });

  it("stop button aborts an in-flight stream and marks the partial answer as stopped", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      hangingStreamImplementation,
    );
    render(<AskAIPage />);

    typeAndSubmit("big query");
    await screen.findByText("Working on it...");

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    await screen.findByText("Stopped");
    // Partial content is preserved
    expect(screen.getByText("Working on it...")).toBeInTheDocument();
    // Input is usable again
    await waitFor(() => expect(screen.getByRole("textbox")).not.toBeDisabled());
  });

  it("shows retry on a network error and resubmits the same question", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(finalAnswerResponse("Recovered answer."));
    render(<AskAIPage />);

    typeAndSubmit("test question");
    const retryButton = await screen.findByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    await screen.findByText(/Recovered answer/);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(lastFetchBody().messages[0].content).toBe("test question");
  });

  it("shows the limit message without a retry button on 429 limit-reached", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "AI_CFO_LIMIT_REACHED",
          details: { maxAllowed: 100 },
        }),
        { status: 429 },
      ),
    );
    render(<AskAIPage />);

    typeAndSubmit("test question");
    await screen.findByText(/reached your monthly AI token limit/);
    expect(
      screen.queryByRole("button", { name: /retry/i }),
    ).not.toBeInTheDocument();
  });
});
