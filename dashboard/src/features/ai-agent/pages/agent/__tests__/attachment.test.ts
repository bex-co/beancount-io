import { describe, expect, it, beforeEach } from "vitest";
import {
  createStagedEntries,
  markStagedUploadFailed,
  markStagedUploadSucceeded,
  removeStagedFile,
  resetStagedFileIdCounterForTests,
  type StagedFile,
} from "../attachment";

function fakeFile(name: string): File {
  return new File(["col\n1"], name, { type: "text/csv" });
}

describe("staged attachment identity", () => {
  beforeEach(() => {
    resetStagedFileIdCounterForTests();
  });

  it("assigns distinct ids including duplicate filenames", () => {
    const [a, b] = createStagedEntries([
      fakeFile("dup.csv"),
      fakeFile("dup.csv"),
    ]);
    expect(a.id).not.toBe(b.id);
    expect(a.file.name).toBe("dup.csv");
    expect(b.file.name).toBe("dup.csv");
  });

  it("ignores completion for a removed earlier file without touching the later one", () => {
    let staged = createStagedEntries([
      fakeFile("first.csv"),
      fakeFile("second.csv"),
    ]);
    const [first, second] = staged;

    staged = removeStagedFile(staged, first.id);
    expect(staged).toHaveLength(1);
    expect(staged[0]?.id).toBe(second.id);
    expect(staged[0]?.uploading).toBe(true);

    // Late failure for the removed first must not mutate second.
    staged = markStagedUploadFailed(staged, first.id);
    expect(staged).toHaveLength(1);
    expect(staged[0]?.id).toBe(second.id);
    expect(staged[0]?.uploading).toBe(true);
    expect(staged[0]?.error).toBeUndefined();

    staged = markStagedUploadFailed(staged, second.id);
    expect(staged[0]?.uploading).toBe(false);
    expect(staged[0]?.error).toBe("Upload failed");
  });

  it("keeps each surviving file's own objectKey across out-of-order completion", () => {
    let staged = createStagedEntries([
      fakeFile("first.csv"),
      fakeFile("second.csv"),
      fakeFile("third.csv"),
    ]);
    const [first, second, third] = staged;

    staged = removeStagedFile(staged, second.id);

    staged = markStagedUploadSucceeded(staged, third.id, "key-third");
    staged = markStagedUploadSucceeded(staged, first.id, "key-first");
    // Removed middle file's success must not rewrite another entry.
    staged = markStagedUploadSucceeded(staged, second.id, "key-second-gone");

    expect(staged.map((sf: StagedFile) => [sf.id, sf.objectKey])).toEqual([
      [first.id, "key-first"],
      [third.id, "key-third"],
    ]);
    expect(staged.every((sf) => !sf.uploading)).toBe(true);
  });

  it("supports later batches after removals without index aliasing", () => {
    let staged = createStagedEntries([fakeFile("a.csv"), fakeFile("b.csv")]);
    const [a, b] = staged;
    staged = removeStagedFile(staged, a.id);

    const [c] = createStagedEntries([fakeFile("c.csv")]);
    staged = [...staged, c];

    staged = markStagedUploadSucceeded(staged, b.id, "key-b");
    staged = markStagedUploadSucceeded(staged, c.id, "key-c");

    expect(staged.map((sf) => sf.objectKey)).toEqual(["key-b", "key-c"]);
  });
});
