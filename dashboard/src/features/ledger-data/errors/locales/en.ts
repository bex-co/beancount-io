export interface TranslationEntry {
  message: string;
  description: string;
}

const enErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "All entries have been parsed successfully.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Error Message",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Errors",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Failed to Load Errors",
    description: "Error title when errors fail to load",
  },
  "page.errors.failedToLoadErrorsDescription": {
    message:
      "There was an error loading the error data. Please try again later.",
    description: "Error description when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "No Errors Found",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Unknown file",
    description: "Text shown when filename is unknown",
  },
};

export default enErrors;
