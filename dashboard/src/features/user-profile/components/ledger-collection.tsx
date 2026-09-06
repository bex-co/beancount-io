import { useRef, useState } from "react";
import { BookOpen, ChevronDown, Search, SearchX, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { useTranslations } from "@/common/hooks/use-translations";
import type { UserRepository } from "@/graphql/definitions";
import { RepositoryListItem } from "./repository-list-item";

const PAGE_SIZE = 12;

export function LedgerCollection({
  username,
  repositories,
}: {
  username: string;
  repositories: UserRepository[];
}) {
  const { t } = useTranslations();
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const search = query.trim().toLocaleLowerCase();
  const filtered = repositories
    .filter((repo) =>
      `${repo.name} ${repo.description || ""}`
        .toLocaleLowerCase()
        .includes(search),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) ||
          a.name.localeCompare(b.name),
    );
  const visible = filtered.slice(0, visibleCount);

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  const clearSearch = () => {
    updateQuery("");
    searchInput.current?.focus();
  };

  return (
    <section aria-labelledby="ledger-collection-heading" className="min-w-0">
      <div className="mb-6">
        <h2
          id="ledger-collection-heading"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
        >
          {t("userProfile.repositories")}{" "}
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {repositories.length}
          </span>
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("userProfile.browseDescription")}
        </p>
      </div>
      {repositories.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              ref={searchInput}
              type="search"
              aria-label={t("userProfile.searchLedgers")}
              placeholder={t("userProfile.searchLedgers")}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              className="h-11 bg-card ps-10 pe-11 shadow-none [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("userProfile.clearSearch")}
                onClick={clearSearch}
                className="absolute end-0 top-0 size-11"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
          <div className="relative">
            <select
              aria-label={t("userProfile.sortLedgers")}
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-md border bg-card ps-3 pe-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
            >
              <option value="updated">
                {t("userProfile.recentlyUpdated")}
              </option>
              <option value="name">{t("userProfile.nameAZ")}</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-3.5 size-4 text-muted-foreground"
            />
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          {repositories.length === 0 ? (
            <BookOpen
              aria-hidden="true"
              className="mb-4 size-8 text-muted-foreground"
            />
          ) : (
            <SearchX
              aria-hidden="true"
              className="mb-4 size-8 text-muted-foreground"
            />
          )}
          <p className="text-sm text-muted-foreground">
            {t(
              repositories.length === 0
                ? "userProfile.noRepositories"
                : "userProfile.noMatches",
            )}
          </p>
          {query && (
            <Button variant="outline" onClick={clearSearch} className="mt-4">
              {t("userProfile.clearSearch")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((repo) => (
            <RepositoryListItem
              key={repo.fullName}
              {...repo}
              ownerUsername={username}
            />
          ))}
        </div>
      )}
      {repositories.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p role="status" className="text-xs text-muted-foreground">
            {t("userProfile.results", {
              shown: visible.length,
              total: filtered.length,
            })}
          </p>
          {visible.length < filtered.length && (
            <Button
              variant="outline"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="h-11 px-6"
            >
              {t("userProfile.showMoreLedgers")}
              <ChevronDown aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
