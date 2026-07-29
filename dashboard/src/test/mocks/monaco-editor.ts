/**
 * Mock for monaco-editor module in tests
 * This allows tests to import monaco types without requiring the full Monaco Editor runtime
 */

export const languages = {
  FoldingRangeKind: {
    Region: 1,
    Comment: 2,
    Imports: 3,
  },
};

export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

export const editor = {
  setModelMarkers: () => {},
  MarkerSeverity,
};

export const KeyMod = {};
export const KeyCode = {};

export default {};
