import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enUS } from "react-day-picker/locale/en-US";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReceiptPage from "../receipt-page";

const uploads = vi.hoisted(() => ({ count: 0 }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({ ledgerOwner: "owner", ledgerName: "books" }),
  useHydrated: () => true,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
}));
vi.mock("@/features/importer/hooks/use-temp-asset-upload", () => ({
  useTempAssetUpload: () => ({
    uploadFile: async () => {
      uploads.count += 1;
      return { objectKey: "temp/receipt-1.png" };
    },
  }),
}));
// Plain inputs stand in for the ledger pickers; the review's lock must
// reach them like any other control.
vi.mock("@/common/components/ledger-comboboxes", () => {
  const Picker = ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder ?? "Currency"}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  );
  return { AccountCombobox: Picker, CurrencyCombobox: Picker };
});

type Insert = {
  variables: Record<string, unknown>;
  answer: (
    outcome: "success" | "refused" | "network" | "fault" | "invalid",
  ) => void;
};

/** Parses one receipt, and holds every Record until the test answers it. */
function receiptClient() {
  const inserts: Insert[] = [];
  let parses = 0;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "ParseReceipt") {
            parses += 1;
            observer.next({
              data: {
                parseReceipt: {
                  __typename: "ParsedReceipt",
                  date: "2026-08-01",
                  payee: "Corner Cafe",
                  description: "Coffee",
                  amount: -12.5,
                  sourceAccount: "Assets:Checking",
                  targetAccount: "Expenses:Coffee",
                },
              },
            });
            observer.complete();
            return;
          }
          inserts.push({
            variables: operation.variables,
            answer: (outcome) => {
              if (outcome === "network") {
                observer.error(new TypeError("Failed to fetch"));
                return;
              }
              if (outcome === "fault" || outcome === "invalid") {
                observer.next({
                  data: null,
                  errors: [
                    {
                      message: outcome,
                      extensions: {
                        code:
                          outcome === "fault"
                            ? "INTERNAL_SERVER_ERROR"
                            : "BAD_USER_INPUT",
                      },
                    },
                  ],
                } as never);
                observer.complete();
                return;
              }
              observer.next({
                data: {
                  insertReceiptTransaction: {
                    __typename: "InsertReceiptTransactionResult",
                    success: outcome === "success",
                  },
                },
              });
              observer.complete();
            },
          });
        }),
    ),
  });
  return { client, inserts, parses: () => parses };
}

async function reviewReceipt() {
  const user = userEvent.setup();
  const receipt = receiptClient();
  const { container } = render(
    <ApolloProvider client={receipt.client}>
      <ReceiptPage />
    </ApolloProvider>,
  );
  await user.upload(
    container.querySelector<HTMLInputElement>("#receipt-file-input")!,
    new File(["png"], "receipt.png", { type: "image/png" }),
  );
  await screen.findByRole("button", { name: "Record Transaction" });
  return { user, ...receipt };
}

const field = (name: string) => screen.getByRole("textbox", { name });
const amount = () => screen.getByRole("spinbutton", { name: "Amount" });

async function correctReview(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(field("Payee"));
  await user.type(field("Payee"), "Corrected Cafe");
  await user.clear(field("Description"));
  await user.type(field("Description"), "Team coffee");
  await user.clear(amount());
  await user.type(amount(), "18.75");
}

const postings = (insert: Insert) =>
  (insert.variables.input as { postings: { amountNumber: string }[] }).postings;

/** Answers the first Record with `outcome` and returns the alert's text. */
async function failRecord(outcome: "fault" | "invalid") {
  const { user, inserts } = await reviewReceipt();
  await user.click(screen.getByRole("button", { name: "Record Transaction" }));
  await waitFor(() => expect(inserts).toHaveLength(1));
  inserts[0].answer(outcome);
  return (await screen.findByRole("alert")).textContent;
}

/** The success card shows the snapshot that was recorded. */
async function recorded() {
  await waitFor(() =>
    expect(screen.queryByRole("textbox", { name: "Payee" })).toBeNull(),
  );
  expect(screen.getByText("Corrected Cafe", { selector: "dd" })).toBeVisible();
  expect(screen.getByText("18.75 USD", { selector: "dd" })).toBeVisible();
}

beforeEach(() => {
  uploads.count = 0;
});

/** Recording keeps the review it was sent from (w4/m48). */
describe("Receipt Record", () => {
  it("locks the review while Record is pending and shows the submitted snapshot", async () => {
    const { user, inserts } = await reviewReceipt();
    await correctReview(user);
    await user.click(
      screen.getByRole("button", { name: "Record Transaction" }),
    );
    await waitFor(() => expect(inserts).toHaveLength(1));

    // The whole review is locked, Upload Different Receipt included.
    expect(field("Payee")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Upload Different Receipt" }),
    ).toBeDisabled();

    expect(inserts[0].variables.receiptObjectKey).toBe("temp/receipt-1.png");
    expect(inserts[0].variables.input).toMatchObject({
      payee: "Corrected Cafe",
      description: "Team coffee",
    });
    expect(postings(inserts[0]).map((p) => p.amountNumber)).toEqual([
      "18.75",
      "-18.75",
    ]);

    inserts[0].answer("success");
    await recorded();
  });

  it("keeps the corrected review after a lost connection and records it on retry", async () => {
    const { user, inserts, parses } = await reviewReceipt();
    await correctReview(user);
    const record = screen.getByRole("button", { name: "Record Transaction" });
    record.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(inserts).toHaveLength(1));

    inserts[0].answer("network");
    // The review stays, with what was sent and an honest outcome.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /may have been recorded anyway.*check the Journal/i,
    );
    expect(field("Payee")).toHaveValue("Corrected Cafe");
    expect(field("Description")).toHaveValue("Team coffee");
    expect(amount()).toHaveValue("18.75");
    expect(field("Payee")).toBeEnabled();
    await waitFor(() => expect(record).toHaveFocus());

    // A deliberate retry sends the same review once, with no new upload or parse.
    await user.keyboard("{Enter}");
    await waitFor(() => expect(inserts).toHaveLength(2));
    expect(inserts[1].variables).toEqual(inserts[0].variables);
    expect(uploads.count).toBe(1);
    expect(parses()).toBe(1);

    inserts[1].answer("success");
    await recorded();
  });

  it("keeps the review after a refusal, without claiming it may exist", async () => {
    const { user, inserts } = await reviewReceipt();
    await correctReview(user);
    await user.click(
      screen.getByRole("button", { name: "Record Transaction" }),
    );
    await waitFor(() => expect(inserts).toHaveLength(1));

    inserts[0].answer("refused");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to record receipt transaction");
    expect(alert).not.toHaveTextContent(/Journal/);
    expect(field("Payee")).toHaveValue("Corrected Cafe");

    // Upload Different Receipt still starts over on purpose.
    await user.click(
      screen.getByRole("button", { name: "Upload Different Receipt" }),
    );
    expect(screen.queryByRole("textbox", { name: "Payee" })).toBeNull();
    expect(screen.getByText(/Choose File/)).toBeInTheDocument();
  });
  it("treats a server fault as possibly recorded, but not a refusal", async () => {
    expect(await failRecord("fault")).toMatch(/check the Journal/);
    cleanup();
    expect(await failRecord("invalid")).not.toMatch(/Journal/);
  });
});
