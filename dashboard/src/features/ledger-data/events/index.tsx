import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { Calendar, Filter, ChevronDown } from "lucide-react";
import { GetLedgerEventsDocument } from "@/graphql/definitions";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { EmptyState } from "@/common/components/empty-state";
import { QueryView } from "@/common/components/query-view";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { Skeleton } from "@/common/components/ui/skeleton";

/**
 * Events page component
 * Displays a timeline chart and event tables for ledger events
 */
export default function LedgerEventsPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/events",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Get ledger searchParams from topbar
  const ledgerFilters = useLedgerSearchParams();

  const { data, loading, error } = useQuery(GetLedgerEventsDocument, {
    variables: {
      ledgerId: ledgerId,
      time: ledgerFilters.searchParams.time,
      filter: ledgerFilters.searchParams.filter,
      account: ledgerFilters.searchParams.account,
    },
    skip: !ledgerId,
  });

  // Track topbar filter changes
  const topbarFilterKey = useMemo(
    () =>
      JSON.stringify({
        time: ledgerFilters.searchParams.time,
        filter: ledgerFilters.searchParams.filter,
        account: ledgerFilters.searchParams.account,
      }),
    [
      ledgerFilters.searchParams.time,
      ledgerFilters.searchParams.filter,
      ledgerFilters.searchParams.account,
    ],
  );
  const previousTopbarFilterKeyRef = useRef(topbarFilterKey);

  // Reset local searchParams when topbar searchParams change (scheduled asynchronously to avoid cascading renders)
  useEffect(() => {
    if (previousTopbarFilterKeyRef.current !== topbarFilterKey) {
      previousTopbarFilterKeyRef.current = topbarFilterKey;
      // Use queueMicrotask to schedule the state updates asynchronously
      queueMicrotask(() => {
        setSearchTerm("");
        setSelectedEventType("all");
      });
    }
  }, [topbarFilterKey]);

  const events = useMemo(
    () => data?.getLedgerEvents || [],
    [data?.getLedgerEvents],
  );

  // Get unique event types for filter dropdown
  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(events.map((event) => event.type)));
    return ["all", ...types].sort();
  }, [events]);

  // Filter events based on selected type and search term
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType =
        selectedEventType === "all" || event.type === selectedEventType;
      const matchesSearch =
        searchTerm === "" ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [events, selectedEventType, searchTerm]);

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerEvents" />
      <PageHeader
        title={t("page.events.events")}
        description={t("common.pageDescription.events", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />

      <QueryView
        loading={loading}
        error={error}
        data={events}
        loadingSlot={
          <div className="space-y-3">
            <div className="flex gap-4">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        }
        errorMessage={t("page.events.failedToLoadEvents")}
        isEmpty={(e) => e.length === 0}
        emptySlot={
          <EmptyState
            iconName="Calendar"
            title={t("page.events.noEventsFound")}
            description={t("page.events.noEventsFoundForLedger")}
          />
        }
      >
        {() => (
          <>
            {/* Filters and Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      placeholder={t("page.events.searchEvents")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Event Type Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        {selectedEventType === "all"
                          ? t("page.accounts.allTypes")
                          : selectedEventType}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {eventTypes.map((type) => (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => setSelectedEventType(type)}
                        >
                          {type === "all" ? t("page.accounts.allTypes") : type}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Results Count */}
                <div className="text-sm text-muted-foreground">
                  {t("page.events.eventsCount", {
                    filtered: filteredEvents.length,
                    total: events.length,
                  })}
                </div>
              </div>

              <div>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {t("page.events.noEventsFound")}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || selectedEventType !== "all"
                        ? t("page.events.noEventsMatchFilters")
                        : t("page.events.noEventsFoundForLedger")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="px-2 sm:px-3 py-1.5 sm:py-2">
                            {t("journal.date")}
                          </TableHead>
                          <TableHead className="px-2 sm:px-3 py-1.5 sm:py-2">
                            {t("page.accounts.type")}
                          </TableHead>
                          <TableHead className="px-2 sm:px-3 py-1.5 sm:py-2">
                            {t("page.events.description")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event, index) => (
                          <TableRow key={`${event.date}-${index}`}>
                            <TableCell className="font-mono text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                              {formatDateISO(event.date)}
                            </TableCell>
                            <TableCell className="px-2 sm:px-3 py-1.5 sm:py-2">
                              <Badge variant="outline"> {event.type}</Badge>
                            </TableCell>
                            <TableCell className="px-2 sm:px-3 py-1.5 sm:py-2">
                              {event.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </QueryView>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.documents"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/documents`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
          },
        ]}
      />
    </div>
  );
}
