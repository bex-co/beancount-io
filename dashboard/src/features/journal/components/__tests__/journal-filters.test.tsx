import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JournalFilters } from "@/features/journal/components/journal-filters";
import { DirectiveType } from "@/common/types/journal";

const defaultProps = {
  selectedDirectiveTypes: [] as DirectiveType[],
  onDirectiveTypesChange: vi.fn(),
  selectedTransactionSubtypes: [] as string[],
  onTransactionSubtypesChange: vi.fn(),
  selectedDocumentSubtypes: [] as string[],
  onDocumentSubtypesChange: vi.fn(),
  selectedCustomSubtypes: [] as string[],
  onCustomSubtypesChange: vi.fn(),
  showMetadata: false,
  onShowMetadataChange: vi.fn(),
  showPostings: false,
  onShowPostingsChange: vi.fn(),
};

describe("JournalFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("directive type buttons", () => {
    it("renders all main directive type buttons", () => {
      render(<JournalFilters {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /transaction/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /balance/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /note/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /document/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /price/i }),
      ).toBeInTheDocument();
    });

    it("calls onDirectiveTypesChange when a directive button is clicked", () => {
      const onDirectiveTypesChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          onDirectiveTypesChange={onDirectiveTypesChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /transaction/i }));

      expect(onDirectiveTypesChange).toHaveBeenCalledWith(
        expect.arrayContaining([DirectiveType.TRANSACTION]),
      );
    });

    it("marks a selected directive button as pressed", () => {
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.PRICE]}
        />,
      );

      expect(screen.getByRole("button", { name: "Price" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("deselects a directive when its button is clicked while active", () => {
      const onDirectiveTypesChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.NOTE]}
          onDirectiveTypesChange={onDirectiveTypesChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Note" }));

      expect(onDirectiveTypesChange).toHaveBeenCalledWith([]);
    });
  });

  describe("transaction subtype buttons", () => {
    it("shows transaction subtype buttons only when Transaction is selected", () => {
      const { rerender } = render(<JournalFilters {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: /cleared transactions/i }),
      ).not.toBeInTheDocument();

      rerender(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
        />,
      );

      expect(
        screen.getByRole("button", { name: /cleared transactions/i }),
      ).toBeInTheDocument();
    });

    it("calls onTransactionSubtypesChange when a subtype is clicked while parent is selected", () => {
      const onTransactionSubtypesChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
          onTransactionSubtypesChange={onTransactionSubtypesChange}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /cleared transactions/i }),
      );

      expect(onTransactionSubtypesChange).toHaveBeenCalledWith(["cleared"]);
    });

    it("subtype buttons are not rendered when parent directive is not selected", () => {
      render(<JournalFilters {...defaultProps} selectedDirectiveTypes={[]} />);

      expect(
        screen.queryByRole("button", { name: /cleared transactions/i }),
      ).not.toBeInTheDocument();
    });

    it("clears transaction subtypes when the Transaction directive is deselected", () => {
      const onTransactionSubtypesChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
          selectedTransactionSubtypes={["cleared"]}
          onTransactionSubtypesChange={onTransactionSubtypesChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Transaction" }));

      expect(onTransactionSubtypesChange).toHaveBeenCalledWith([]);
    });
  });

  describe("UI toggle buttons", () => {
    it("renders metadata and postings toggle buttons", () => {
      render(<JournalFilters {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /metadata/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /postings/i }),
      ).toBeInTheDocument();
    });

    it("calls onShowMetadataChange when metadata toggle is clicked", () => {
      const onShowMetadataChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          onShowMetadataChange={onShowMetadataChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /metadata/i }));

      expect(onShowMetadataChange).toHaveBeenCalledWith(true);
    });

    it("calls onShowPostingsChange when postings toggle is clicked", () => {
      const onShowPostingsChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          onShowPostingsChange={onShowPostingsChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /postings/i }));

      expect(onShowPostingsChange).toHaveBeenCalledWith(true);
    });

    it("reflects showMetadata=true as aria-pressed on the metadata button", () => {
      render(<JournalFilters {...defaultProps} showMetadata />);

      expect(screen.getByRole("button", { name: /metadata/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("reflects showPostings=true as aria-pressed on the postings button", () => {
      render(<JournalFilters {...defaultProps} showPostings />);

      expect(screen.getByRole("button", { name: /postings/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("toggles showMetadata off when currently true", () => {
      const onShowMetadataChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          showMetadata
          onShowMetadataChange={onShowMetadataChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /metadata/i }));

      expect(onShowMetadataChange).toHaveBeenCalledWith(false);
    });
  });

  describe("document subtype cascade", () => {
    it("shows document subtypes when Document is selected", () => {
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.DOCUMENT]}
        />,
      );

      expect(
        screen.getByRole("button", { name: /discovered documents/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /linked documents/i }),
      ).toBeInTheDocument();
    });

    it("clears document subtypes when Document is deselected", () => {
      const onDocumentSubtypesChange = vi.fn();
      render(
        <JournalFilters
          {...defaultProps}
          selectedDirectiveTypes={[DirectiveType.DOCUMENT]}
          selectedDocumentSubtypes={["linked"]}
          onDocumentSubtypesChange={onDocumentSubtypesChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Document" }));

      expect(onDocumentSubtypesChange).toHaveBeenCalledWith([]);
    });
  });
});
