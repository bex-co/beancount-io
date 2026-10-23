import {
  clockInstructions,
  localDate,
  parseClientClock,
} from "../client-clock";
import { createInsertReceiptTransactionTool } from "../../tools/insert-receipt-transaction-tool";
import { BeancountAgent } from "../../service/agent-handler/beancount-agent";

// w21/856: the agent was told no date and no zone, and an undated receipt was
// filed under the server's UTC day.
describe("the caller's today", () => {
  // 2026-10-24 00:30 UTC: still the 23rd in Los Angeles, already the 24th in Paris.
  const instant = new Date("2026-10-24T00:30:00Z");
  // 2026-10-23 19:30 UTC: the morning of the 24th in Auckland.
  const morning = new Date("2026-10-23T19:30:00Z");

  it("is the calendar day in the zone, not the server's", () => {
    expect(localDate(instant, "America/Los_Angeles")).toBe("2026-10-23");
    expect(localDate(instant, "Europe/Paris")).toBe("2026-10-24");
    expect(localDate(morning, "Pacific/Auckland")).toBe("2026-10-24");
    expect(localDate(morning, "UTC")).toBe("2026-10-23");
  });

  it("takes a zone name only, and ignores anything else", () => {
    expect(parseClientClock("America/Los_Angeles", instant)).toEqual({
      timeZone: "America/Los_Angeles",
      today: "2026-10-23",
    });
    for (const bad of [undefined, null, 5, "", "Not/AZone", "x".repeat(100)]) {
      expect(parseClientClock(bad, instant)).toBeUndefined();
    }
  });

  it("tells the agent the date and zone, or that the zone is unknown", () => {
    const clock = parseClientClock("Pacific/Auckland", morning);
    expect(clockInstructions(clock, morning)).toContain(
      "Today's date is 2026-10-24 in the user's time zone (Pacific/Auckland)",
    );
    expect(clockInstructions(undefined, morning)).toContain(
      "2026-10-23 (UTC); the user's time zone is unknown",
    );
  });

  it("is in the agent's instructions", () => {
    const agent = new BeancountAgent(
      {} as never,
      {
        services: {} as never,
        identity: {} as never,
        ledgerId: "alice/books",
        llmService: {} as never,
        ledgerReceiptWorkflow: {} as never,
      },
      "write",
      { timeZone: "Pacific/Auckland", today: "2026-10-24" },
    );
    const instructions = (
      agent as unknown as {
        agent: { settings: { instructions: string } };
      }
    ).agent.settings.instructions;
    expect(instructions).toContain("Today's date is 2026-10-24");
  });

  it("files an undated receipt under the caller's day", async () => {
    const insertReceiptTransaction = jest.fn(async () => ({ success: true }));
    const receiptTool = createInsertReceiptTransactionTool({
      services: {} as never,
      identity: {} as never,
      ledgerId: "alice/books",
      llmService: {} as never,
      today: "2026-10-23",
      ledgerReceiptWorkflow: { insertReceiptTransaction } as never,
    });
    await (
      receiptTool as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      }
    ).execute({
      receiptObjectKey: "tmp/r.jpg",
      date: null,
      payee: "Cafe",
      description: "latte",
      amount: "4.50",
      currency: "USD",
      expenseAccount: "Expenses:Food",
      paymentAccount: "Assets:Cash",
      documentAccount: "Expenses:Food",
    });
    expect(insertReceiptTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ date: "2026-10-23" }),
      }),
    );
  });
});
