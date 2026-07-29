import { describe, it, expect } from "vitest";
import { filterEmptyTreeNodes, filterNoTxnTreeNodes } from "../utils";
import type { SerializableTreeNode } from "@/graphql/definitions";

// Helper function to create test nodes
const createNode = (
  overrides: Partial<SerializableTreeNode>,
): SerializableTreeNode => ({
  __typename: "SerializableTreeNode",
  account: "TestAccount",
  balance: {},
  balanceChildren: {},
  cost: null,
  costChildren: null,
  children: [],
  hasTxns: false,
  ...overrides,
});

// Type-safe helper to convert SerializableTreeNode to children array format
const toChild = (node: SerializableTreeNode): Record<string, unknown> =>
  node as unknown as Record<string, unknown>;

// Type-safe helper to access child as SerializableTreeNode
const asTreeNode = (child: Record<string, unknown>): SerializableTreeNode =>
  child as unknown as SerializableTreeNode;

describe("Balance Sheet Utils", () => {
  describe("filterEmptyTreeNodes", () => {
    it("should keep nodes with non-empty balance", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: 100 },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result).toEqual(node);
      expect(result.children).toHaveLength(0);
    });

    it("should keep nodes with non-empty balanceChildren", () => {
      const node = createNode({
        account: "Assets",
        balanceChildren: { USD: 200 },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result).toEqual(node);
    });

    it("should keep nodes with non-empty cost", () => {
      const node = createNode({
        account: "Assets",
        cost: { USD: 50 },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result).toEqual(node);
    });

    it("should keep nodes with non-empty costChildren", () => {
      const node = createNode({
        account: "Assets",
        costChildren: { USD: 75 },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result).toEqual(node);
    });

    it("should filter out child nodes with all empty data", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: 100 },
        children: [
          toChild(
            createNode({
              account: "EmptyChild",
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.account).toBe("Assets");
      expect(result.children).toHaveLength(0);
    });

    it("should keep child nodes with non-empty data", () => {
      const node = createNode({
        account: "Assets",
        children: [
          toChild(
            createNode({
              account: "ValidChild",
              balance: { USD: 50 },
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
      expect(asTreeNode(result.children[0]).account).toBe("ValidChild");
    });

    it("should handle nested children recursively", () => {
      const node = createNode({
        account: "Root",
        balance: { USD: 100 },
        children: [
          toChild(
            createNode({
              account: "Parent",
              balance: { USD: 50 },
              children: [
                toChild(
                  createNode({
                    account: "GrandChild",
                    balance: { USD: 25 },
                  }),
                ),
              ],
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
      const parent = asTreeNode(result.children[0]);
      expect(parent.account).toBe("Parent");
      expect(parent.children).toHaveLength(1);
      expect(asTreeNode(parent.children[0]).account).toBe("GrandChild");
    });

    it("should filter out nested empty nodes", () => {
      const node = createNode({
        account: "Root",
        balance: { USD: 100 },
        children: [
          toChild(
            createNode({
              account: "Parent",
              balance: { USD: 50 },
              children: [
                toChild(
                  createNode({
                    account: "EmptyGrandChild",
                  }),
                ),
              ],
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
      const parent = asTreeNode(result.children[0]);
      expect(parent.account).toBe("Parent");
      expect(parent.children).toHaveLength(0);
    });

    it("should handle empty balance with zero values", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: 0 },
        balanceChildren: { EUR: 0 },
      });

      const result = filterEmptyTreeNodes(node);

      // Top level is always returned
      expect(result.account).toBe("Assets");
    });

    it("should handle mixed empty and non-empty children", () => {
      const node = createNode({
        account: "Root",
        balance: { USD: 100 },
        children: [
          toChild(
            createNode({
              account: "EmptyChild",
            }),
          ),
          toChild(
            createNode({
              account: "ValidChild",
              balance: { USD: 50 },
            }),
          ),
          toChild(
            createNode({
              account: "AnotherEmptyChild",
              balance: { USD: 0 },
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
      expect(asTreeNode(result.children[0]).account).toBe("ValidChild");
    });

    it("should always return top level node even when empty", () => {
      const node = createNode({
        account: "Root",
      });

      const result = filterEmptyTreeNodes(node);

      expect(result).toBeDefined();
      expect(result.account).toBe("Root");
      expect(result.children).toHaveLength(0);
    });

    it("should handle null values in balance objects", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: null as unknown as number },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.account).toBe("Assets");
    });

    it("should handle undefined values in balance objects", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: undefined as unknown as number },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.account).toBe("Assets");
    });

    it("should handle empty string values", () => {
      const node = createNode({
        account: "Assets",
        balance: { USD: "" as unknown as number },
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.account).toBe("Assets");
    });

    it("should keep nodes with children even if own data is empty", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(
            createNode({
              account: "ValidChild",
              balance: { USD: 100 },
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
    });

    it("should handle multiple levels of nesting", () => {
      const node = createNode({
        account: "Level1",
        balance: { USD: 100 },
        children: [
          toChild(
            createNode({
              account: "Level2",
              children: [
                toChild(
                  createNode({
                    account: "Level3",
                    children: [
                      toChild(
                        createNode({
                          account: "Level4",
                          balance: { EUR: 25 },
                        }),
                      ),
                    ],
                  }),
                ),
              ],
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(1);
      const level2 = asTreeNode(result.children[0]);
      expect(level2.children).toHaveLength(1);
      const level3 = asTreeNode(level2.children[0]);
      expect(level3.children).toHaveLength(1);
      const level4 = asTreeNode(level3.children[0]);
      expect(level4.account).toBe("Level4");
    });

    it("should handle complex nested structure with mixed empty and non-empty nodes", () => {
      const node = createNode({
        account: "Root",
        balance: { USD: 1000 },
        children: [
          toChild(
            createNode({
              account: "Branch1",
              balance: { USD: 500 },
              children: [
                toChild(
                  createNode({
                    account: "EmptyLeaf",
                  }),
                ),
                toChild(
                  createNode({
                    account: "ValidLeaf",
                    balance: { USD: 250 },
                  }),
                ),
              ],
            }),
          ),
          toChild(
            createNode({
              account: "EmptyBranch",
            }),
          ),
          toChild(
            createNode({
              account: "Branch2",
              balanceChildren: { EUR: 300 },
            }),
          ),
        ],
      });

      const result = filterEmptyTreeNodes(node);

      expect(result.children).toHaveLength(2);
      const branch1 = asTreeNode(result.children[0]);
      expect(branch1.account).toBe("Branch1");
      expect(branch1.children).toHaveLength(1);
      expect(asTreeNode(branch1.children[0]).account).toBe("ValidLeaf");

      const branch2 = asTreeNode(result.children[1]);
      expect(branch2.account).toBe("Branch2");
    });
  });

  describe("filterNoTxnTreeNodes", () => {
    it("should keep leaf nodes with hasTxns: true", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(createNode({ account: "ActiveLeaf", hasTxns: true })),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(1);
      expect(asTreeNode(result.children[0]).account).toBe("ActiveLeaf");
    });

    it("should remove leaf nodes with hasTxns: false", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(createNode({ account: "InactiveLeaf", hasTxns: false })),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(0);
    });

    it("should always return top-level node even if hasTxns: false", () => {
      const node = createNode({ account: "Root", hasTxns: false });

      const result = filterNoTxnTreeNodes(node);

      expect(result).toBeDefined();
      expect(result.account).toBe("Root");
    });

    it("should keep parent with hasTxns: false if it has surviving children", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(
            createNode({
              account: "ParentNoTxns",
              hasTxns: false,
              children: [
                toChild(createNode({ account: "ActiveChild", hasTxns: true })),
              ],
            }),
          ),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(1);
      const parent = asTreeNode(result.children[0]);
      expect(parent.account).toBe("ParentNoTxns");
      expect(parent.children).toHaveLength(1);
    });

    it("should remove parent with hasTxns: false when all children are removed", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(
            createNode({
              account: "ParentNoTxns",
              hasTxns: false,
              children: [
                toChild(
                  createNode({ account: "InactiveChild", hasTxns: false }),
                ),
              ],
            }),
          ),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(0);
    });

    it("should filter recursively across multiple levels", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(
            createNode({
              account: "Level2",
              hasTxns: false,
              children: [
                toChild(
                  createNode({
                    account: "Level3Active",
                    hasTxns: true,
                  }),
                ),
                toChild(
                  createNode({
                    account: "Level3Inactive",
                    hasTxns: false,
                  }),
                ),
              ],
            }),
          ),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(1);
      const level2 = asTreeNode(result.children[0]);
      expect(level2.account).toBe("Level2");
      expect(level2.children).toHaveLength(1);
      expect(asTreeNode(level2.children[0]).account).toBe("Level3Active");
    });

    it("should keep nodes with hasTxns: true regardless of children", () => {
      const node = createNode({
        account: "Root",
        children: [
          toChild(createNode({ account: "ActiveLeaf", hasTxns: true })),
          toChild(createNode({ account: "InactiveLeaf", hasTxns: false })),
        ],
      });

      const result = filterNoTxnTreeNodes(node);

      expect(result.children).toHaveLength(1);
      expect(asTreeNode(result.children[0]).account).toBe("ActiveLeaf");
    });
  });
});
