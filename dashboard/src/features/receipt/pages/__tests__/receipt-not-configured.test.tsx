import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReceiptPage from "../receipt-page";

/**
 * A deployment without temporary-asset storage refuses the upload URL, and
 * one without an LLM key refuses the parse, as CONFIGURATION_ERROR with a hint
 * naming the variables to set. The page shows that hint and offers no Try
 * Again, which would be refused the same way. The real upload hook runs; only
 * the API and the storage PUT are stubbed.
 */
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

const STORAGE_HINT =
  "Set TEMP_ASSETS_AWS_S3_BUCKET, TEMP_ASSETS_AWS_S3_ACCESS_KEY_ID, and TEMP_ASSETS_AWS_S3_SECRET_ACCESS_KEY (see .env.example)";
const LLM_HINT = "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)";

type Refusal = { message: string; code: string; hint?: string };

/** Answers the upload URL and the parse, refusing `refuse` as told. */
function client(refuse: { operation: string } & Refusal) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === refuse.operation) {
            observer.next({
              data: null,
              errors: [
                {
                  message: refuse.message,
                  extensions: { code: refuse.code, hint: refuse.hint },
                },
              ],
            } as never);
          } else if (operation.operationName === "GenerateTempAssetUploadUrl") {
            observer.next({
              data: {
                generateTempAssetUploadUrl: {
                  __typename: "TempAssetUploadUrl",
                  uploadUrl: "https://storage.test/put",
                  objectKey: "temp/receipt-1.png",
                  expiresIn: 900,
                },
              },
            } as never);
          } else {
            throw new Error(`unexpected ${operation.operationName}`);
          }
          observer.complete();
        }),
    ),
  });
}

async function uploadReceipt(refuse: { operation: string } & Refusal) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 200 }),
  );
  const user = userEvent.setup();
  const { container } = render(
    <ApolloProvider client={client(refuse)}>
      <ReceiptPage />
    </ApolloProvider>,
  );
  await user.upload(
    container.querySelector<HTMLInputElement>("#receipt-file-input")!,
    new File(["png"], "receipt.png", { type: "image/png" }),
  );
  return screen.findByRole("alert");
}

afterEach(() => vi.restoreAllMocks());

describe("Receipt on an unconfigured deployment", () => {
  it.each([
    [
      "storage for the upload",
      {
        operation: "GenerateTempAssetUploadUrl",
        message: "Object storage is not configured on this deployment",
        code: "CONFIGURATION_ERROR",
        hint: STORAGE_HINT,
      },
    ],
    [
      "the AI model for the parse",
      {
        operation: "ParseReceipt",
        message: "LLM is not configured on this deployment",
        code: "CONFIGURATION_ERROR",
        hint: LLM_HINT,
      },
    ],
  ])("names the operator hint when %s is not set up", async (_, refuse) => {
    const alert = await uploadReceipt(refuse);

    expect(alert).toHaveTextContent(
      `This feature isn't set up on this server. ${refuse.message}. ${refuse.hint}`,
    );
    expect(alert).not.toHaveTextContent(/try again/i);
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
  });

  it("still offers Try Again for a passing server fault", async () => {
    const alert = await uploadReceipt({
      operation: "ParseReceipt",
      message: "boom",
      code: "INTERNAL_SERVER_ERROR",
    });

    expect(alert).not.toHaveTextContent("isn't set up");
    expect(screen.getByRole("button", { name: "Try Again" })).toBeVisible();
  });
});
