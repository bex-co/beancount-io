import { useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Code2,
  ExternalLink,
  FileCode2,
  Github,
  Layers3,
  Menu,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { track } from "@/common/analytics";
import { useTranslations } from "@/common/hooks/use-translations";
import { Button, buttonVariants } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { cn } from "@/common/lib/utils/utils";
import {
  ACCOUNTING_FORMATS,
  CATALOG_REVIEWED_ON,
  engineComparisons,
  TOOL_CATEGORIES,
  tools,
  WORKFLOWS,
  type AccountingFormat,
  type CatalogTool,
  type ToolCategory,
  type Workflow,
} from "./catalog";
import { CONTRIBUTION_URL } from "./metadata";
import {
  EMPTY_FILTERS,
  filterTools,
  type CatalogFilters,
} from "./filter-tools";

const categoryIcons: Record<ToolCategory, LucideIcon> = {
  engine: TerminalSquare,
  editor: Code2,
  importer: ArrowDownToLine,
  reporting: BarChart3,
  mobile: Smartphone,
};

const workflowIcons: Record<Workflow, LucideIcon> = {
  newcomer: Sparkles,
  automation: FileCode2,
  investing: CircleDollarSign,
  "self-hosting": ShieldCheck,
  mobile: Smartphone,
};

const categoryDescriptionKeys: Record<ToolCategory, string> = {
  engine: "awesome.category.engineDescription",
  editor: "awesome.category.editorDescription",
  importer: "awesome.category.importerDescription",
  reporting: "awesome.category.reportingDescription",
  mobile: "awesome.category.mobileDescription",
};

const categoryTitleKeys: Record<ToolCategory, string> = {
  engine: "awesome.category.engine",
  editor: "awesome.category.editor",
  importer: "awesome.category.importer",
  reporting: "awesome.category.reporting",
  mobile: "awesome.category.mobile",
};

const formatLabelKeys: Record<AccountingFormat, string> = {
  beancount: "awesome.format.beancount",
  hledger: "awesome.format.hledger",
  ledger: "awesome.format.ledger",
  other: "awesome.format.other",
};

const deliveryLabelKeys: Record<CatalogTool["delivery"], string> = {
  local: "awesome.catalog.local",
  hosted: "awesome.catalog.hosted",
  both: "awesome.catalog.both",
};

const methodologyCriteriaKeys = [
  "awesome.method.criteriaOne",
  "awesome.method.criteriaTwo",
  "awesome.method.criteriaThree",
  "awesome.method.criteriaFour",
] as const;

const methodologyBadgeKeys = [
  "awesome.method.badgeOne",
  "awesome.method.badgeTwo",
  "awesome.method.badgeThree",
] as const;

const workflowTitleKeys: Record<Workflow, string> = {
  newcomer: "awesome.workflow.newcomer.title",
  automation: "awesome.workflow.automation.title",
  investing: "awesome.workflow.investing.title",
  "self-hosting": "awesome.workflow.selfHosting.title",
  mobile: "awesome.workflow.mobile.title",
};

const workflowDescriptionKeys: Record<Workflow, string> = {
  newcomer: "awesome.workflow.newcomer.description",
  automation: "awesome.workflow.automation.description",
  investing: "awesome.workflow.investing.description",
  "self-hosting": "awesome.workflow.selfHosting.description",
  mobile: "awesome.workflow.mobile.description",
};

type ActionDestination = Parameters<
  typeof track<"awesome_pta_action_clicked">
>[1]["destination"];

function trackAction(
  action: Parameters<typeof track<"awesome_pta_action_clicked">>[1]["action"],
  destination: ActionDestination,
) {
  track("awesome_pta_action_clicked", { action, destination });
}

function sectionDestination(category: ToolCategory): ActionDestination {
  return category;
}

function formatReviewDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
      {children}
    </p>
  );
}

function CatalogSelect({
  id,
  label,
  value,
  children,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      {label}
      <select
        id={id}
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function ToolCard({ tool }: { tool: CatalogTool }) {
  const { t } = useTranslations();
  const Icon = categoryIcons[tool.category];

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {tool.affiliation && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
              {t("awesome.catalog.affiliated")}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {t(deliveryLabelKeys[tool.delivery])}
          </span>
        </div>
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight">{tool.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {tool.summary}
      </p>

      <dl className="mt-5 grid gap-3 text-sm">
        <div>
          <dt className="font-semibold text-foreground">
            {t("awesome.catalog.bestFor")}
          </dt>
          <dd className="mt-1 leading-5 text-muted-foreground">
            {tool.bestFor}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">
            {t("awesome.catalog.limitation")}
          </dt>
          <dd className="mt-1 leading-5 text-muted-foreground">
            {tool.limitation}
          </dd>
        </div>
      </dl>

      <div
        className="mt-5 flex flex-wrap gap-1.5"
        aria-label={t("awesome.catalog.formatsAria")}
      >
        {tool.formats.map((format) => (
          <span
            key={format}
            className="rounded-full border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground"
          >
            {t(formatLabelKeys[format])}
          </span>
        ))}
        <span className="rounded-full border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {tool.license}
        </span>
      </div>

      <a
        href={tool.href}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
        onClick={() => trackAction("tool", sectionDestination(tool.category))}
      >
        {t("awesome.catalog.openProject")}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </article>
  );
}

function PublicHeader() {
  const { t } = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    ["#compare", "awesome.nav.compare", "comparison"],
    ["#stack", "awesome.nav.stack", "catalog"],
    ["#catalog", "awesome.nav.catalog", "catalog"],
    ["#method", "awesome.nav.method", "method"],
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="https://beancount.io/"
          className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight"
        >
          <img
            src="/lgasset/logo.png"
            alt=""
            className="size-8 rounded-md object-contain"
          />
          <span>Beancount.io</span>
        </a>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label={t("awesome.nav.sections")}
        >
          {navItems.map(([href, labelKey, destination]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => trackAction("section", destination)}
            >
              {t(labelKey)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/auth/sign-up?next=%2Fledger"
            className={buttonVariants({ size: "sm" })}
            onClick={() => trackAction("hosted", "hosted")}
          >
            {t("awesome.nav.startFree")}
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={t("awesome.nav.catalog")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="grid border-t border-border bg-background p-3 md:hidden"
          aria-label={t("awesome.nav.sections")}
        >
          {navItems.map(([href, labelKey, destination]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent"
              onClick={() => {
                setMenuOpen(false);
                trackAction("section", destination);
              }}
            >
              {t(labelKey)}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function AwesomePlainTextAccountingPage() {
  const { t, i18n } = useTranslations();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const hadSearch = useRef(false);
  const filteredTools = useMemo(() => filterTools(tools, filters), [filters]);
  const engineById = new Map(
    tools
      .filter((tool) => tool.category === "engine")
      .map((tool) => [tool.id, tool]),
  );

  const setFilter = <Key extends keyof CatalogFilters>(
    key: Key,
    value: CatalogFilters[Key],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== "query") {
      track("awesome_pta_filter_changed", {
        filter: key,
        state: value === "all" ? "cleared" : "applied",
      });
    }
  };

  const handleSearch = (value: string) => {
    setFilters((current) => ({ ...current, query: value }));
    const hasSearch = value.trim().length > 0;
    if (hasSearch !== hadSearch.current) {
      track("awesome_pta_filter_changed", {
        filter: "search",
        state: hasSearch ? "applied" : "cleared",
      });
      hadSearch.current = hasSearch;
    }
  };

  const clearFilters = () => {
    const activeFilters: Array<
      Parameters<typeof track<"awesome_pta_filter_changed">>[1]["filter"]
    > = [];
    if (filters.query.trim().length > 0) activeFilters.push("search");
    if (filters.category !== "all") activeFilters.push("category");
    if (filters.format !== "all") activeFilters.push("format");
    if (filters.workflow !== "all") activeFilters.push("workflow");

    setFilters(EMPTY_FILTERS);
    hadSearch.current = false;
    activeFilters.forEach((filter) => {
      track("awesome_pta_filter_changed", {
        filter,
        state: "cleared",
      });
    });
  };

  const chooseWorkflow = (workflow: Workflow) => {
    setFilter("workflow", workflow);
    trackAction("guide", "catalog");
    requestAnimationFrame(() => {
      document
        .getElementById("catalog")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only fixed top-3 left-3 z-[100] rounded-lg bg-background px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only"
      >
        {t("awesome.skipToContent")}
      </a>
      <PublicHeader />

      <main id="main">
        <section className="relative isolate overflow-hidden border-b border-border/70">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_52%)]" />
          <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t("awesome.hero.eyebrow", {
                count: tools.length,
                date: formatReviewDate(
                  CATALOG_REVIEWED_ON,
                  i18n.resolvedLanguage ?? i18n.language,
                ),
              })}
            </div>
            <h1 className="mt-7 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              {t("awesome.hero.title")}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              {t("awesome.hero.subtitle")}
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
              {t("awesome.hero.disclosure")}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#compare"
                className={buttonVariants({ size: "lg" })}
                onClick={() => trackAction("section", "comparison")}
              >
                {t("awesome.hero.compareCta")}
                <ArrowRight aria-hidden="true" />
              </a>
              <a
                href="#catalog"
                className={buttonVariants({ variant: "outline", size: "lg" })}
                onClick={() => trackAction("section", "catalog")}
              >
                {t("awesome.hero.browseCta")}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <SectionEyebrow>{t("awesome.chooser.eyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("awesome.chooser.title")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t("awesome.chooser.subtitle")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {WORKFLOWS.map((workflow) => {
              const Icon = workflowIcons[workflow];
              return (
                <button
                  key={workflow}
                  type="button"
                  className="group flex min-h-56 flex-col rounded-2xl border border-border bg-card p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  onClick={() => chooseWorkflow(workflow)}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-5 font-semibold leading-5">
                    {t(workflowTitleKeys[workflow])}
                  </span>
                  <span className="mt-2 text-sm leading-5 text-muted-foreground">
                    {t(workflowDescriptionKeys[workflow])}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-5 text-xs font-semibold text-primary">
                    {t("awesome.chooser.action")}
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          id="compare"
          className="scroll-mt-20 border-y border-border/70 bg-muted/30"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-3xl">
              <SectionEyebrow>{t("awesome.compare.eyebrow")}</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {t("awesome.compare.title")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                {t("awesome.compare.subtitle")}
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[920px] border-collapse text-start text-sm">
                <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-5 py-4 text-start font-semibold">
                      {t("awesome.compare.engine")}
                    </th>
                    <th className="px-5 py-4 text-start font-semibold">
                      {t("awesome.compare.bestFor")}
                    </th>
                    <th className="px-5 py-4 text-start font-semibold">
                      {t("awesome.compare.strongestAt")}
                    </th>
                    <th className="px-5 py-4 text-start font-semibold">
                      {t("awesome.compare.consider")}
                    </th>
                    <th className="px-5 py-4 text-start font-semibold">
                      {t("awesome.compare.interface")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {engineComparisons.map((comparison) => {
                    const engine = engineById.get(comparison.toolId);
                    if (!engine) return null;
                    return (
                      <tr
                        key={comparison.toolId}
                        className="border-t border-border align-top"
                      >
                        <th className="px-5 py-5 text-start">
                          <span className="block text-base font-semibold">
                            {engine.name}
                          </span>
                          <a
                            href={engine.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            onClick={() => trackAction("tool", "engine")}
                          >
                            {t("awesome.compare.openProject")}
                            <ExternalLink
                              className="size-3"
                              aria-hidden="true"
                            />
                          </a>
                        </th>
                        <td className="px-5 py-5 leading-6 text-muted-foreground">
                          {comparison.bestFor}
                        </td>
                        <td className="px-5 py-5 leading-6 text-muted-foreground">
                          {comparison.strongestAt}
                        </td>
                        <td className="px-5 py-5 leading-6 text-muted-foreground">
                          {comparison.consider}
                        </td>
                        <td className="px-5 py-5 leading-6 text-muted-foreground">
                          {comparison.interface}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <aside className="mt-10 grid gap-6 rounded-2xl border border-primary/25 bg-primary/8 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
              <div>
                <SectionEyebrow>{t("awesome.hosted.eyebrow")}</SectionEyebrow>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  {t("awesome.hosted.title")}
                </h3>
                <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
                  {t("awesome.hosted.description")}
                </p>
                <a
                  href="https://github.com/bex-co/beancount-io"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  onClick={() => trackAction("tool", "hosted")}
                >
                  <Github className="size-4" aria-hidden="true" />
                  {t("awesome.hosted.source")}
                </a>
              </div>
              <a
                href="/auth/sign-up?next=%2Fledger"
                className={buttonVariants({ size: "lg" })}
                onClick={() => trackAction("hosted", "hosted")}
              >
                {t("awesome.hosted.cta")}
                <ArrowRight aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>

        <section
          id="stack"
          className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="max-w-3xl">
            <SectionEyebrow>{t("awesome.stack.eyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("awesome.stack.title")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t("awesome.stack.subtitle")}
            </p>
          </div>

          <ol className="mt-10 grid gap-3 lg:grid-cols-5">
            {TOOL_CATEGORIES.map((category, index) => {
              const Icon = categoryIcons[category];
              return (
                <li key={category} className="relative">
                  <a
                    href={`#catalog-${category}`}
                    className="flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/35 lg:block"
                    onClick={() => trackAction("section", category)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="lg:mt-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        0{index + 1}
                      </p>
                      <h3 className="mt-1 font-semibold">
                        {t(categoryTitleKeys[category])}
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        {t(categoryDescriptionKeys[category])}
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          id="catalog"
          className="scroll-mt-20 border-y border-border/70 bg-muted/30"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-3xl">
              <SectionEyebrow>{t("awesome.catalog.eyebrow")}</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {t("awesome.catalog.title")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                {t("awesome.catalog.subtitle")}
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-xl sm:p-5 lg:sticky lg:top-16 lg:z-30">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
                <label
                  className="grid gap-2 text-sm font-medium"
                  htmlFor="tool-search"
                >
                  {t("awesome.catalog.searchLabel")}
                  <span className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="tool-search"
                      type="search"
                      className="h-11 ps-10"
                      placeholder={t("awesome.catalog.searchPlaceholder")}
                      value={filters.query}
                      onChange={(event) => handleSearch(event.target.value)}
                    />
                  </span>
                </label>

                <CatalogSelect
                  id="category-filter"
                  label={t("awesome.catalog.categoryLabel")}
                  value={filters.category}
                  onChange={(value) =>
                    setFilter("category", value as ToolCategory | "all")
                  }
                >
                  <option value="all">
                    {t("awesome.catalog.allCategories")}
                  </option>
                  {TOOL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(categoryTitleKeys[category])}
                    </option>
                  ))}
                </CatalogSelect>

                <CatalogSelect
                  id="format-filter"
                  label={t("awesome.catalog.formatLabel")}
                  value={filters.format}
                  onChange={(value) =>
                    setFilter("format", value as AccountingFormat | "all")
                  }
                >
                  <option value="all">{t("awesome.catalog.allFormats")}</option>
                  {ACCOUNTING_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {t(formatLabelKeys[format])}
                    </option>
                  ))}
                </CatalogSelect>

                <CatalogSelect
                  id="workflow-filter"
                  label={t("awesome.catalog.workflowLabel")}
                  value={filters.workflow}
                  onChange={(value) =>
                    setFilter("workflow", value as Workflow | "all")
                  }
                >
                  <option value="all">
                    {t("awesome.catalog.allWorkflows")}
                  </option>
                  {WORKFLOWS.map((workflow) => (
                    <option key={workflow} value={workflow}>
                      {t(workflowTitleKeys[workflow])}
                    </option>
                  ))}
                </CatalogSelect>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {t("awesome.catalog.resultCount", {
                    count: filteredTools.length,
                    total: tools.length,
                  })}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X aria-hidden="true" />
                  {t("awesome.catalog.clearFilters")}
                </Button>
              </div>
            </div>

            {filteredTools.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <Layers3
                  className="mx-auto size-10 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg font-semibold">
                  {t("awesome.catalog.emptyTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("awesome.catalog.emptyDescription")}
                </p>
                <Button
                  className="mt-5"
                  variant="outline"
                  onClick={clearFilters}
                >
                  {t("awesome.catalog.clearFilters")}
                </Button>
              </div>
            ) : (
              <div className="mt-14 space-y-16">
                {TOOL_CATEGORIES.map((category) => {
                  const categoryTools = filteredTools.filter(
                    (tool) => tool.category === category,
                  );
                  if (categoryTools.length === 0) return null;
                  const Icon = categoryIcons[category];
                  return (
                    <section
                      key={category}
                      id={`catalog-${category}`}
                      className="scroll-mt-56"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-2xl font-semibold tracking-tight">
                            {t(categoryTitleKeys[category])}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t(categoryDescriptionKeys[category])}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 flex snap-x gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-3">
                        {categoryTools.map((tool) => (
                          <div
                            key={tool.id}
                            className="w-[82vw] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none"
                          >
                            <ToolCard tool={tool} />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section
          id="method"
          className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="max-w-3xl">
            <SectionEyebrow>{t("awesome.method.eyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("awesome.method.title")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t("awesome.method.subtitle")}
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold">
                {t("awesome.method.criteriaTitle")}
              </h3>
              <ul className="mt-5 grid gap-4">
                {methodologyCriteriaKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold">
                {t("awesome.method.badgesTitle")}
              </h3>
              <ul className="mt-5 grid gap-4">
                {methodologyBadgeKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 rounded-2xl bg-foreground p-7 text-background sm:flex-row sm:items-center sm:justify-between sm:p-9 dark:bg-card dark:text-card-foreground">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">
                {t("awesome.contribute.title")}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
                {t("awesome.contribute.description")}
              </p>
            </div>
            <a
              href={CONTRIBUTION_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "shrink-0",
              )}
              onClick={() => trackAction("contribute", "contribute")}
            >
              <Github aria-hidden="true" />
              {t("awesome.contribute.cta")}
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-semibold">Beancount.io</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t("awesome.footer.description")}
            </p>
          </div>
          <div className="flex gap-5 text-sm font-medium">
            <a
              href="https://beancount.io/docs"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => trackAction("guide", "catalog")}
            >
              {t("awesome.footer.docs")}
            </a>
            <a
              href="https://github.com/bex-co/beancount-io"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => trackAction("tool", "catalog")}
            >
              {t("awesome.footer.github")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AwesomePlainTextAccountingPage;
