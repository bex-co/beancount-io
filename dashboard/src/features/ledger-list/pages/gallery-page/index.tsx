import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLazyQuery } from "@apollo/client/react";
import { Search, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { cn } from "@/common/lib/utils/utils";
import {
  SearchLedgersDocument,
  type SearchLedgersQuery,
  type SearchLedgersQueryVariables,
} from "@/graphql/definitions";
import { useDebounce } from "@/common/hooks/use-debounce";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Empty state component for gallery search
 */
function EmptyState() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">
        {t("page.gallery.noLedgersFound")}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t("page.gallery.tryAdjustingSearchQuery")}
      </p>
    </div>
  );
}

/**
 * Gallery playground page component
 * Displays a searchable combobox for finding and navigating to ledgers
 */
export default function GalleryPage() {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [searchLedgers, { data, loading, error }] = useLazyQuery<
    SearchLedgersQuery,
    SearchLedgersQueryVariables
  >(SearchLedgersDocument);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      void searchLedgers({
        variables: {
          q: debouncedQuery.trim(),
          limit: 50,
        },
      });
    }
  }, [debouncedQuery, searchLedgers]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle ledger selection - navigate to ledger overview
  const handleLedgerSelect = (ledgerId: string) => {
    if (ledgerId) {
      const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
      setIsDropdownOpen(false);
      setSearchQuery("");
      void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setHighlightedIndex(-1);

    // Open dropdown if there's text and it's at least 2 characters
    if (value.trim().length >= 2) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (debouncedQuery.trim().length >= 2 && data?.searchLedgers) {
      setIsDropdownOpen(true);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!data?.searchLedgers || data.searchLedgers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < data.searchLedgers.length - 1 ? prev + 1 : prev,
      );
      setIsDropdownOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      setIsDropdownOpen(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < data.searchLedgers.length
      ) {
        handleLedgerSelect(data.searchLedgers[highlightedIndex].id);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current && isDropdownOpen) {
      const item = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`,
      );
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isDropdownOpen]);

  return (
    <>
      <PageSEO
        titleKey="seo.ledgerGallery.title"
        descriptionKey="seo.ledgerGallery.description"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          {/* Header Section */}
          <header className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <img
                src="/lgasset/logo.png"
                alt={t("common.beancountLogo")}
                onClick={() => window.history.back()}
                className="h-16 w-16 sm:h-20 sm:w-20 cursor-pointer"
              />
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                  {t("page.gallery.ledgerGallery")}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                  {t("page.gallery.ledgerGalleryDescription")}
                </p>
              </div>
            </div>
          </header>

          {/* Content Section */}
          <main className="flex-1 flex flex-col items-center justify-start max-w-2xl w-full mx-auto pb-12">
            <Card className="w-full border-2">
              <CardContent>
                <div className="space-y-4">
                  <div ref={containerRef} className="relative">
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        id="ledger-search"
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onKeyDown={handleKeyDown}
                        placeholder={t("page.gallery.searchLedgersPlaceholder")}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={isDropdownOpen}
                        aria-autocomplete="list"
                        aria-controls="ledger-search-listbox"
                        aria-activedescendant={
                          isDropdownOpen && highlightedIndex >= 0
                            ? `ledger-search-option-${highlightedIndex}`
                            : undefined
                        }
                        className="w-full pr-8 h-12 text-base"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery("");
                            setIsDropdownOpen(false);
                            inputRef.current?.focus();
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm hover:bg-muted p-1 z-10 cursor-pointer"
                          aria-label={t("common.clearInput")}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        id="ledger-search-listbox"
                        role="listbox"
                        className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg max-h-[300px] overflow-auto"
                      >
                        {loading && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        )}

                        {error && (
                          <div className="p-4">
                            <Alert variant="destructive">
                              <AlertDescription>
                                {t("page.gallery.failedToSearchLedgers")}:{" "}
                                {t(getErrorMessageKey(error))}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}

                        {!loading &&
                          !error &&
                          debouncedQuery.trim().length >= 2 &&
                          data?.searchLedgers &&
                          data.searchLedgers.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {t("page.gallery.noLedgersFound")}
                            </div>
                          )}

                        {!loading &&
                          !error &&
                          debouncedQuery.trim().length < 2 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {t("collaboration.typeAtLeast2Characters")}
                            </div>
                          )}

                        {!loading &&
                          !error &&
                          data?.searchLedgers &&
                          data.searchLedgers.length > 0 && (
                            <div className="p-1">
                              {data.searchLedgers.map((ledger, index) => (
                                <div
                                  key={ledger.id}
                                  id={`ledger-search-option-${index}`}
                                  data-index={index}
                                  className={cn(
                                    "flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors",
                                    highlightedIndex === index
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent/50",
                                  )}
                                  onClick={() => handleLedgerSelect(ledger.id)}
                                  onMouseEnter={() =>
                                    setHighlightedIndex(index)
                                  }
                                  role="option"
                                  aria-selected={highlightedIndex === index}
                                >
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium truncate">
                                      {ledger.name}
                                    </span>
                                    {ledger.fullName &&
                                      ledger.fullName !== ledger.name && (
                                        <span className="text-sm text-muted-foreground truncate">
                                          {ledger.fullName}
                                        </span>
                                      )}
                                    {ledger.description && (
                                      <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {ledger.description}
                                      </span>
                                    )}
                                  </div>
                                  <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {!isDropdownOpen && !loading && !error && (
                    <>
                      {debouncedQuery.trim().length >= 2 &&
                        data?.searchLedgers &&
                        data.searchLedgers.length === 0 && <EmptyState />}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}
