import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { base64Decode } from "@/common/lib/utils/encode";
import LedgerFileView from "../index";

/**
 * Saving an edited text file keeps the UTF-8 byte-order mark it was stored
 * with, and adds none to a file without one (w4/268). The editor gets the
 * real decoder's text, which never contains the mark.
 */
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
const state = vi.hoisted(() => ({
  content: "",
  mutate: vi.fn(),
  onSave: undefined as
    | undefined
    | ((content: string, base: unknown) => Promise<void>),
  file: undefined as unknown,
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ query: async () => ({ data: {} }) }),
  useQuery: () => ({
    data: {
      getLedgerFile: {
        path: "qa.csv",
        sha: "seed-sha",
        size: 43,
        content: state.content,
      },
      getLedgerErrors: [],
    },
  }),
  useMutation: () => [state.mutate],
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));
vi.mock("../file-content-view", () => ({
  FileContentView: (props: {
    fileContent: unknown;
    onSave: (content: string, base: unknown) => Promise<void>;
  }) => {
    state.onSave = props.onSave;
    state.file = props.fileContent;
    return null;
  },
}));

const BODY = "payee,city\r\nqa-20261020 original,café\r\n";
const bytesOf = (text: string) => [...new TextEncoder().encode(text)];
const base64Of = (bytes: number[]) => btoa(String.fromCharCode(...bytes));
const sentBytes = () => {
  const { content } = state.mutate.mock.calls.at(-1)![0].variables;
  return [...atob(content)].map((char) => char.charCodeAt(0));
};

async function editAndSave(stored: number[]) {
  state.content = base64Of(stored);
  state.mutate.mockReset().mockResolvedValue({ data: {} });
  render(<LedgerFileView ledgerId="qa/books" filePath="qa.csv" />);
  // What the editor holds: the decoded text, then a prefix edit.
  const edited = `qa-20261020 ${base64Decode(state.content)}`;
  await act(async () => state.onSave!(edited, state.file));
  return edited;
}

describe("saving a text file's encoding marker", () => {
  it("keeps an existing UTF-8 BOM once", async () => {
    const edited = await editAndSave([0xef, 0xbb, 0xbf, ...bytesOf(BODY)]);
    expect(edited.startsWith("﻿")).toBe(false);
    expect(sentBytes()).toEqual([0xef, 0xbb, 0xbf, ...bytesOf(edited)]);
  });

  it("leaves a file without a BOM byte-exact", async () => {
    const edited = await editAndSave(bytesOf(BODY));
    expect(sentBytes()).toEqual(bytesOf(edited));
  });
});
