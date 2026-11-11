import type { DirectiveJson } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import {
  buildEntryIdMap,
  inheritDirectiveSourceId,
  markGeneratedDirective,
  parseLedgerFiles,
  seedDirectiveSourceIds,
  sliceSha256,
} from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";

/**
 * A copy a plugin generates shares its source's text and checksum, so the
 * context of a copy has to say so: a client that edits or deletes "the copy"
 * changes the source and every other copy (w21/443).
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

jest.mock("@/foundation/rustledger/source-slice-worker", () => {
  const findEntrySliceAsync = jest.fn();
  return {
    findEntrySliceAsync,
    // A batch resolves each entry as the single lookup does (w1/237).
    findEntrySlicesAsync: (
      files: unknown,
      entryPoint: unknown,
      hashes: string[],
    ) =>
      Promise.all(
        hashes.map((hash) => findEntrySliceAsync(files, entryPoint, hash)),
      ),
  };
});

const SLICE =
  '2026-06-01 * "QA Insurer" "car insurance"\n  amortize_months: "12"';

const posting = (account: string, number: string) => ({
  account,
  units: { number, currency: "USD" },
});

const template = {
  type: "transaction",
  date: "2026-06-01",
  flag: "*",
  payee: "QA Insurer",
  narration: "car insurance",
  tags: [],
  links: [],
  meta: { amortize_months: "12" },
  postings: [
    posting("Expenses:Insurance", "600.00"),
    posting("Assets:Bank", "-600.00"),
  ],
} as unknown as DirectiveJson;

function copyOf(source: DirectiveJson, n: number): DirectiveJson {
  const copy = {
    ...source,
    date: `2026-0${6 + n}-01`,
    narration: `car insurance (${n + 1}/12)`,
  } as DirectiveJson;
  inheritDirectiveSourceId(source, copy);
  markGeneratedDirective(copy);
  return copy;
}

function serviceFor(directives: DirectiveJson[]) {
  (loadCachedFileMapForRepo as jest.Mock).mockResolvedValue({
    files: { "main.bean": `${SLICE}\n` },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  (parseLedgerFiles as jest.Mock).mockResolvedValue({
    directives,
    errors: [],
  });
  (findEntrySliceAsync as jest.Mock).mockResolvedValue({
    file: "main.bean",
    slice: SLICE,
    sha256: sliceSha256(SLICE),
    startLine: 0,
    endLine: 2,
    localOccurrence: 0,
  });
  return new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  );
}

describe("entry context for a plugin-generated copy", () => {
  it("names the entry it was generated from; the source itself is not a copy", async () => {
    const source = { ...template } as DirectiveJson;
    seedDirectiveSourceIds([source]);
    const copies = [copyOf(source, 0), copyOf(source, 1)];
    const directives = [source, ...copies];
    const ids = buildEntryIdMap(directives);
    const service = serviceFor(directives);

    const copy = await service.getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: ids.get(copies[1])!,
    });
    // The copy answers with the source's text and checksum, as before.
    expect(copy.slice).toBe(SLICE);
    expect(copy.sha256sum).toBe(sliceSha256(SLICE));
    expect(copy.generated_from).toBe(ids.get(source));

    const own = await service.getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: ids.get(source)!,
    });
    expect(own.generated_from).toBeNull();
  });

  it("is null for an entry a plugin only rewrote", async () => {
    const source = { ...template } as DirectiveJson;
    seedDirectiveSourceIds([source]);
    const linked = { ...source, links: ["receipt"] } as DirectiveJson;
    inheritDirectiveSourceId(source, linked);
    const directives = [linked];
    const service = serviceFor(directives);
    const context = await service.getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: buildEntryIdMap(directives).get(linked)!,
    });
    expect(context.generated_from).toBeNull();
  });
});
