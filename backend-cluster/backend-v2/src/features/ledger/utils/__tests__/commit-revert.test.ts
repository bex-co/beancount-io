import {
  commitSubject,
  defaultRevertMessage,
  planRevert,
  revertedStatus,
  type Blob,
} from "../commit-revert";

const blob = (sha: string, content = "Y29udGVudA=="): Blob => ({
  sha,
  content,
});

describe("revertedStatus", () => {
  it("narrows a git host's file status to what a revert distinguishes", () => {
    expect(revertedStatus("added")).toBe("added");
    expect(revertedStatus("removed")).toBe("removed");
    expect(revertedStatus("deleted")).toBe("removed");
    expect(revertedStatus("modified")).toBe("modified");
    expect(revertedStatus(undefined)).toBe("modified");
  });
});

describe("planRevert", () => {
  it("deletes a file the commit added, checking it is untouched since", () => {
    expect(
      planRevert([{ path: "new.bean", status: "added" }], {
        "new.bean": {
          atCommit: blob("c1"),
          atParent: null,
          current: blob("c1"),
        },
      }),
    ).toEqual({
      operations: [{ operation: "delete", path: "new.bean", sha: "c1" }],
      conflicts: [],
    });
  });

  it("sets a modified file back to its parent's contents", () => {
    expect(
      planRevert([{ path: "main.bean", status: "modified" }], {
        "main.bean": {
          atCommit: blob("c2", "bmV3"),
          atParent: blob("p2", "b2xk"),
          current: blob("c2", "bmV3"),
        },
      }),
    ).toEqual({
      operations: [
        { operation: "update", path: "main.bean", content: "b2xk", sha: "c2" },
      ],
      conflicts: [],
    });
  });

  it("creates a removed file again from the parent", () => {
    expect(
      planRevert([{ path: "old.bean", status: "removed" }], {
        "old.bean": {
          atCommit: null,
          atParent: blob("p3", "b2xk"),
          current: null,
        },
      }),
    ).toEqual({
      operations: [{ operation: "create", path: "old.bean", content: "b2xk" }],
      conflicts: [],
    });
  });

  // A later commit that touched the file would be discarded by the revert.
  it.each([
    [
      "modified",
      { atCommit: blob("c"), atParent: blob("p"), current: blob("later") },
    ],
    ["added", { atCommit: blob("c"), atParent: null, current: blob("later") }],
  ] as const)("refuses a %s file a later commit changed", (status, blobs) => {
    const plan = planRevert([{ path: "f.bean", status }], { "f.bean": blobs });
    expect(plan.operations).toEqual([]);
    expect(plan.conflicts).toEqual(["f.bean has changed since the commit"]);
  });

  it("refuses a file that is gone, one that exists again, and one with no parent", () => {
    expect(
      planRevert([{ path: "a", status: "added" }], {
        a: { atCommit: blob("c"), atParent: null, current: null },
      }).conflicts,
    ).toEqual(["a was added by the commit and has since been removed"]);
    expect(
      planRevert([{ path: "b", status: "removed" }], {
        b: { atCommit: null, atParent: blob("p"), current: blob("again") },
      }).conflicts,
    ).toEqual(["b was removed by the commit and exists again"]);
    expect(
      planRevert([{ path: "c", status: "modified" }], {
        c: { atCommit: blob("c1"), atParent: null, current: blob("c1") },
      }).conflicts,
    ).toEqual([
      "c is not in the commit's parent, so there is nothing to restore",
    ]);
  });

  it("reports every file in the way, and plans nothing it would half do", () => {
    const plan = planRevert(
      [
        { path: "ok.bean", status: "added" },
        { path: "moved.bean", status: "modified" },
      ],
      {
        "ok.bean": { atCommit: blob("c"), atParent: null, current: blob("c") },
        "moved.bean": {
          atCommit: blob("c"),
          atParent: blob("p"),
          current: blob("x"),
        },
      },
    );
    expect(plan.conflicts).toEqual(["moved.bean has changed since the commit"]);
  });
});

describe("the revert message", () => {
  it("quotes the first line in git's wording", () => {
    expect(commitSubject("Add rent\n\nbody")).toBe("Add rent");
    expect(defaultRevertMessage("abc123", "Add rent")).toBe(
      'Revert "Add rent"\n\nThis reverts commit abc123.',
    );
  });
});
