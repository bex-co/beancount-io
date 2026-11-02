import { describe, expect, it } from "vitest";
import type { FieldNode, OperationDefinitionNode } from "graphql";
import { UpdateLedgerFileDocument } from "@/graphql/definitions";

/**
 * A save uploads the whole file, so its result must not download it back:
 * on a 312KB `main.bean` that doubled what every save moved (w1/m41). The
 * editor already holds what it saved, and nothing reads the result's content.
 */
describe("UpdateLedgerFile", () => {
  it("asks for the new revision, not the file's content", () => {
    const operation = UpdateLedgerFileDocument
      .definitions[0] as OperationDefinitionNode;
    const updateLedgerFile = operation.selectionSet.selections[0] as FieldNode;
    const fields = updateLedgerFile.selectionSet!.selections.map(
      (selection) => (selection as FieldNode).name.value,
    );

    expect(fields).toContain("sha");
    expect(fields).not.toContain("content");
  });
});
