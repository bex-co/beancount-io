import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ParsedRow } from "../../../../types";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count !== undefined ? `${key}:${params.count}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/common/components/ledger-comboboxes", () => {
  const Field = ({
    label,
    value,
    onValueChange,
    disabled,
  }: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
  return {
    AccountCombobox: (props: {
      placeholder?: string;
      value: string;
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }) => <Field label={props.placeholder ?? "account"} {...props} />,
    CurrencyCombobox: (props: {
      value: string;
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }) => <Field label="currency" {...props} />,
  };
});

/** Each AI Fill waits until the test settles it. */
const pending: {
  resolve: (suggestions: Map<number, unknown>) => void;
  reject: (error: Error) => void;
}[] = [];
const categorizeTransactions = vi.fn(
  () =>
    new Promise<Map<number, unknown>>((resolve, reject) =>
      pending.push({ resolve, reject }),
    ),
);
vi.mock("../../../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({ categorizeTransactions, loading: false }),
}));

const rows: ParsedRow[] = [
  {
    id: "row-1",
    date: "2026-10-21",
    payee: "qa-323 first",
    description: "coffee",
    amount: -1.25,
    amountInput: "-1.25",
  },
  {
    id: "row-2",
    date: "2026-10-22",
    payee: "qa-323 second",
    description: "tea",
    amount: 2.5,
    amountInput: "2.50",
  },
];

const food = (rowIndex: number) => [
  rowIndex,
  { rowIndex, targetAccount: "Expenses:Food", confidence: 0.9 },
];
const targets = () =>
  screen.getAllByLabelText(
    "importer.accountMapping.selectAccountPlaceholder",
  ) as HTMLInputElement[];
const aiFill = () =>
  screen.getByRole("button", { name: /importer\.accountMapping\.aiFill/ });

function renderForm() {
  render(
    <TransactionConfigForm
      rows={rows}
      ledgerId="owner/books"
      configDraft={null}
      onConfigDraftChange={vi.fn()}
      onSubmit={vi.fn()}
      onBack={vi.fn()}
    />,
  );
}

beforeEach(() => {
  pending.length = 0;
  categorizeTransactions.mockClear();
  vi.mocked(toast.success).mockClear();
});

/** A target changed while AI Fill is pending stays the reader's (w4/323). */
describe("AI Fill with a pending request", () => {
  it("keeps a target edited during the request and fills the untouched row", async () => {
    renderForm();
    fireEvent.change(targets()[0], {
      target: { value: "Expenses:Before" },
    });
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));

    fireEvent.change(targets()[0], {
      target: { value: "Expenses:Manual" },
    });
    pending[0].resolve(new Map([food(0), food(1)] as [number, unknown][]));

    await waitFor(() => expect(targets()[1]).toHaveValue("Expenses:Food"));
    expect(targets()[0]).toHaveValue("Expenses:Manual");
  });

  it("keeps the edited target's focus and caret when another row fills (w4/1073)", async () => {
    renderForm();
    const edited = targets()[0];
    edited.focus();
    fireEvent.change(edited, { target: { value: "Expenses:Manual" } });
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0].resolve(new Map([food(1)] as [number, unknown][]));

    await waitFor(() => expect(targets()[1]).toHaveValue("Expenses:Food"));
    expect(targets()[0]).toBe(edited);
    expect(edited).toHaveFocus();
    expect(edited).toHaveValue("Expenses:Manual");
    fireEvent.change(edited, {
      target: { value: "Expenses:Manual:More" },
    });
    expect(edited).toHaveValue("Expenses:Manual:More");
  });

  it("keeps focus when no suggestion applies (w4/1073)", async () => {
    renderForm();
    const edited = targets()[0];
    edited.focus();
    fireEvent.change(edited, { target: { value: "Expenses:Manual" } });
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0].resolve(new Map());

    await waitFor(() => expect(aiFill()).toBeEnabled());
    expect(targets()[0]).toBe(edited);
    expect(edited).toHaveFocus();
  });

  it("still fills a target left as it was when the request started", async () => {
    renderForm();
    fireEvent.change(targets()[0], {
      target: { value: "Expenses:Before" },
    });
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0].resolve(new Map([food(0), food(1)] as [number, unknown][]));

    await waitFor(() => expect(targets()[0]).toHaveValue("Expenses:Food"));
    expect(targets()[1]).toHaveValue("Expenses:Food");
  });

  it("keeps the edit through a failure, then a retry fills from there", async () => {
    renderForm();
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(targets()[0], {
      target: { value: "Expenses:Manual" },
    });
    pending[0].reject(new Error("offline"));
    await waitFor(() => expect(aiFill()).toBeEnabled());
    expect(targets()[0]).toHaveValue("Expenses:Manual");
    expect(targets()[1]).toHaveValue("");

    // A deliberate retry starts from the targets as they now stand.
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1].resolve(new Map([food(0), food(1)] as [number, unknown][]));
    await waitFor(() => expect(targets()[0]).toHaveValue("Expenses:Food"));
    expect(targets()[1]).toHaveValue("Expenses:Food");
  });
});

/** The completion message counts the targets AI Fill filled (w4/324). */
describe("AI Fill completion count", () => {
  const suggestion = (rowIndex: number, confidence: number) => [
    rowIndex,
    { rowIndex, targetAccount: "Expenses:Food", confidence },
  ];
  const described = () =>
    vi.mocked(toast.success).mock.calls.at(-1)?.[1]?.description;

  it.each([
    ["none", [0.4, 0.4], "importer.accountMapping.aiNoneApplied", ["", ""]],
    [
      "one",
      [0.9, 0.4],
      "importer.accountMapping.aiSuccessDescription:1",
      ["Expenses:Food", ""],
    ],
    [
      "both, at the 0.5 boundary",
      [0.9, 0.5],
      "importer.accountMapping.aiSuccessDescription:2",
      ["Expenses:Food", "Expenses:Food"],
    ],
  ])("reports %s filled", async (_label, [first, second], message, values) => {
    renderForm();
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0].resolve(
      new Map([suggestion(0, first), suggestion(1, second)] as [
        number,
        unknown,
      ][]),
    );
    await waitFor(() => expect(described()).toBe(message));
    expect(targets().map((t) => t.value)).toEqual(values);
  });

  it("leaves a target kept for the reader out of the count", async () => {
    renderForm();
    fireEvent.click(aiFill());
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(targets()[0], { target: { value: "Expenses:Manual" } });
    pending[0].resolve(
      new Map([suggestion(0, 0.9), suggestion(1, 0.9)] as [number, unknown][]),
    );
    await waitFor(() =>
      expect(described()).toBe(
        "importer.accountMapping.aiSuccessDescription:1",
      ),
    );
  });
});
