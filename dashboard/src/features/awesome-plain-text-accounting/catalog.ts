export const TOOL_CATEGORIES = [
  "engine",
  "editor",
  "importer",
  "reporting",
  "mobile",
] as const;

export const ACCOUNTING_FORMATS = [
  "beancount",
  "hledger",
  "ledger",
  "other",
] as const;

export const WORKFLOWS = [
  "newcomer",
  "automation",
  "investing",
  "self-hosting",
  "mobile",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type AccountingFormat = (typeof ACCOUNTING_FORMATS)[number];
export type Workflow = (typeof WORKFLOWS)[number];

export interface CatalogTool {
  id: string;
  name: string;
  summary: string;
  bestFor: string;
  limitation: string;
  href: string;
  category: ToolCategory;
  formats: readonly AccountingFormat[];
  workflows: readonly Workflow[];
  delivery: "local" | "hosted" | "both";
  license: string;
  affiliation?: "beancount.io";
}

export interface EngineComparison {
  toolId: "beancount" | "hledger" | "ledger";
  bestFor: string;
  strongestAt: string;
  consider: string;
  interface: string;
}

export const CATALOG_REVIEWED_ON = "2026-08-29";

export const tools = [
  {
    id: "beancount",
    name: "Beancount",
    summary:
      "A Python-based accounting language with strict validation, plugins, and strong investment support.",
    bestFor:
      "Programmable books, portfolios, and rich web reporting with Fava.",
    limitation: "Installation and importer setup ask more of a newcomer.",
    href: "https://github.com/beancount/beancount",
    category: "engine",
    formats: ["beancount"],
    workflows: ["newcomer", "automation", "investing", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "hledger",
    name: "hledger",
    summary:
      "A fast, cross-platform accounting suite with CLI, terminal, web, and built-in CSV workflows.",
    bestFor:
      "A cohesive toolset, approachable docs, and flexible journal formats.",
    limitation: "Its ecosystem and syntax differ in places from Beancount.",
    href: "https://hledger.org/",
    category: "engine",
    formats: ["hledger", "ledger"],
    workflows: ["newcomer", "automation", "self-hosting"],
    delivery: "local",
    license: "GPL-3.0+",
  },
  {
    id: "ledger",
    name: "Ledger",
    summary:
      "The original command-line double-entry accounting tool and foundation for much of the PTA ecosystem.",
    bestFor: "Mature CLI workflows and existing Ledger journals.",
    limitation:
      "A smaller first-party UI and onboarding surface than newer suites.",
    href: "https://ledger-cli.org/",
    category: "engine",
    formats: ["ledger"],
    workflows: ["automation", "self-hosting"],
    delivery: "local",
    license: "BSD",
  },
  {
    id: "tackler",
    name: "Tackler",
    summary:
      "A Rust bookkeeping engine with native Git storage, audit modes, and high-throughput reporting.",
    bestFor: "Audit-focused, Git-native, high-volume journals.",
    limitation: "Uses its own journal format and has a smaller ecosystem.",
    href: "https://github.com/tackler-ng/tackler",
    category: "engine",
    formats: ["other"],
    workflows: ["automation", "self-hosting"],
    delivery: "local",
    license: "Apache-2.0",
  },
  {
    id: "zhang",
    name: "Zhang",
    summary:
      "A modern Rust and TypeScript accounting system designed around a Beancount-compatible workflow.",
    bestFor: "Exploring a modern engine and integrated web experience.",
    limitation:
      "A younger project with a smaller contributor and extension base.",
    href: "https://github.com/zhang-accounting/zhang",
    category: "engine",
    formats: ["beancount"],
    workflows: ["self-hosting"],
    delivery: "local",
    license: "AGPL-3.0",
  },
  {
    id: "vscode-beancount",
    name: "VS Code Beancount",
    summary:
      "Syntax highlighting, completion, balance checks, hovers, snippets, and folding for Beancount files.",
    bestFor: "A familiar editor setup with practical Beancount assistance.",
    limitation: "The project is currently looking for additional maintainers.",
    href: "https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount",
    category: "editor",
    formats: ["beancount"],
    workflows: ["newcomer", "automation", "investing"],
    delivery: "local",
    license: "Open source",
  },
  {
    id: "beancount-language-service",
    name: "Beancount Language Service",
    summary:
      "Tree-sitter-powered language features for VS Code, including completion, diagnostics, and semantic highlighting.",
    bestFor:
      "Richer language-server behavior, including browser-based VS Code.",
    limitation:
      "Some browser features are more limited than the desktop extension.",
    href: "https://marketplace.visualstudio.com/items?itemName=fengkx.beancount-lsp-client",
    category: "editor",
    formats: ["beancount"],
    workflows: ["automation", "investing"],
    delivery: "local",
    license: "Open source",
  },
  {
    id: "vim-ledger",
    name: "vim-ledger",
    summary:
      "Vim file detection, highlighting, formatting, completion, folding, and reports for Ledger-style journals.",
    bestFor: "Vim users maintaining Ledger or hledger files.",
    limitation: "Best suited to users already comfortable configuring Vim.",
    href: "https://github.com/ledger/vim-ledger",
    category: "editor",
    formats: ["ledger", "hledger"],
    workflows: ["automation", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0+",
  },
  {
    id: "ledger-mode",
    name: "ledger-mode",
    summary:
      "An Emacs major mode with editing, completion, reconciliation, and reporting support for Ledger journals.",
    bestFor: "Emacs-native Ledger workflows.",
    limitation: "Assumes familiarity with Emacs and Ledger conventions.",
    href: "https://github.com/ledger/ledger-mode",
    category: "editor",
    formats: ["ledger", "hledger"],
    workflows: ["automation", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "beangulp",
    name: "Beangulp",
    summary:
      "Beancount's import framework for turning institution exports into repeatable transaction extraction workflows.",
    bestFor: "Building reusable, tested importers in Python.",
    limitation: "You write or configure source-specific importer code.",
    href: "https://github.com/beancount/beangulp",
    category: "importer",
    formats: ["beancount"],
    workflows: ["automation", "investing", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "beancount-import",
    name: "beancount-import",
    summary:
      "A machine-learning-assisted web workflow for reviewing and matching imported Beancount transactions.",
    bestFor:
      "Interactive review of suggested transaction matches and categories.",
    limitation:
      "Requires importer configuration and a local Python environment.",
    href: "https://github.com/jbms/beancount-import",
    category: "importer",
    formats: ["beancount"],
    workflows: ["automation", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "beancount-reds-importers",
    name: "beancount-reds-importers",
    summary:
      "A maintained collection of configurable importers, plugins, and price helpers for Beancount.",
    bestFor: "Reusing importer patterns across common financial sources.",
    limitation:
      "Institution coverage varies, so source-specific work may remain.",
    href: "https://github.com/redstreet/beancount_reds_importers",
    category: "importer",
    formats: ["beancount"],
    workflows: ["automation", "investing", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "hledger-csv-import",
    name: "hledger CSV Import",
    summary:
      "A built-in rules system that converts bank CSV, TSV, and SSV exports and imports only new transactions.",
    bestFor:
      "Repeatable bank imports without writing a general-purpose program.",
    limitation: "Each source still needs a rules file that matches its export.",
    href: "https://hledger.org/import-csv.html",
    category: "importer",
    formats: ["hledger"],
    workflows: ["newcomer", "automation", "self-hosting"],
    delivery: "local",
    license: "GPL-3.0+",
  },
  {
    id: "ledger2beancount",
    name: "ledger2beancount",
    summary:
      "A conversion tool for migrating Ledger journals into Beancount syntax while preserving useful source structure.",
    bestFor: "A deliberate Ledger-to-Beancount migration.",
    limitation:
      "Complex journals still require compatibility review after conversion.",
    href: "https://github.com/beancount/ledger2beancount",
    category: "importer",
    formats: ["ledger", "beancount"],
    workflows: ["automation", "investing", "self-hosting"],
    delivery: "local",
    license: "GPL-2.0",
  },
  {
    id: "fava",
    name: "Fava",
    summary:
      "The established web interface for Beancount, with reports, charts, queries, an editor, and extension support.",
    bestFor: "Rich local Beancount exploration and reporting.",
    limitation: "You operate the Python service or choose a host that does.",
    href: "https://beancount.github.io/fava/",
    category: "reporting",
    formats: ["beancount"],
    workflows: ["newcomer", "investing", "self-hosting"],
    delivery: "local",
    license: "MIT",
  },
  {
    id: "hledger-web",
    name: "hledger-web",
    summary:
      "hledger's official browser interface for viewing reports and adding or editing transactions.",
    bestFor: "A first-party web UI alongside an hledger journal.",
    limitation:
      "Its reporting experience is intentionally simpler than a full finance dashboard.",
    href: "https://hledger.org/hledger-web.html",
    category: "reporting",
    formats: ["hledger"],
    workflows: ["newcomer", "self-hosting"],
    delivery: "local",
    license: "GPL-3.0+",
  },
  {
    id: "paisa",
    name: "Paisa",
    summary:
      "A local-first personal-finance dashboard supporting Ledger, hledger, and Beancount-style journals.",
    bestFor: "Modern dashboards across multiple PTA formats.",
    limitation:
      "Its opinionated personal-finance workflow may not fit every ledger.",
    href: "https://paisa.fyi/",
    category: "reporting",
    formats: ["beancount", "hledger", "ledger"],
    workflows: ["newcomer", "investing", "self-hosting"],
    delivery: "local",
    license: "AGPL-3.0",
  },
  {
    id: "beanhub",
    name: "BeanHub",
    summary:
      "A hosted, Git-oriented Beancount workspace with imports, forms, collaboration, and reports.",
    bestFor: "Teams or individuals who want a managed Beancount environment.",
    limitation:
      "A hosted service adds vendor-specific workflow around portable files.",
    href: "https://beanhub.io/",
    category: "reporting",
    formats: ["beancount"],
    workflows: ["newcomer", "automation", "investing"],
    delivery: "hosted",
    license: "Commercial service",
  },
  {
    id: "beancount-io",
    name: "Beancount.io",
    summary:
      "Hosted Fava, Git-backed ledgers, imports, reporting, AI workflows, and native mobile clients.",
    bestFor:
      "A managed Beancount stack that remains plain-text and Git accessible.",
    limitation:
      "This listing is affiliated with the curator of this directory.",
    href: "https://beancount.io/fava",
    category: "reporting",
    formats: ["beancount"],
    workflows: ["newcomer", "automation", "investing", "mobile"],
    delivery: "hosted",
    license: "Open-source clients + hosted service",
    affiliation: "beancount.io",
  },
  {
    id: "beancount-mobile",
    name: "Beancount Mobile",
    summary:
      "The open-source Beancount.io client for reviewing reports, adding transactions, and working from iOS or Android.",
    bestFor:
      "Using the same hosted or compatible self-hosted ledger on a phone.",
    limitation: "It is part of the affiliated Beancount.io product family.",
    href: "https://beancount.io/download",
    category: "mobile",
    formats: ["beancount"],
    workflows: ["newcomer", "mobile"],
    delivery: "both",
    license: "MIT client",
    affiliation: "beancount.io",
  },
  {
    id: "nanoledger",
    name: "NanoLedger",
    summary:
      "An Android data-entry app that exports hledger- and Ledger-compatible journal text.",
    bestFor: "Offline Android transaction entry with later journal export.",
    limitation: "It is an entry companion rather than a full reporting system.",
    href: "https://github.com/chvp/NanoLedger",
    category: "mobile",
    formats: ["hledger", "ledger"],
    workflows: ["mobile", "self-hosting"],
    delivery: "local",
    license: "GPL-3.0",
  },
  {
    id: "cashier",
    name: "Cashier",
    summary:
      "An installable web app for entering hledger/Ledger transactions offline and exporting journal text.",
    bestFor:
      "Phone or desktop entry through a lightweight progressive web app.",
    limitation:
      "Advanced syncing requires an additional ledger server workflow.",
    href: "https://github.com/alensiljak/cashier",
    category: "mobile",
    formats: ["hledger", "ledger"],
    workflows: ["mobile", "self-hosting"],
    delivery: "both",
    license: "MIT",
  },
] as const satisfies readonly CatalogTool[];

export type ToolId = (typeof tools)[number]["id"];

export const engineComparisons = [
  {
    toolId: "beancount",
    bestFor: "Investments, strict data, Python automation",
    strongestAt: "Plugins, cost basis, Fava, queryable data",
    consider: "More setup and a distinct journal syntax",
    interface: "CLI + Fava + third-party apps",
  },
  {
    toolId: "hledger",
    bestFor: "One cohesive suite and flexible imports",
    strongestAt: "CLI/TUI/web tools, docs, CSV rules, portability",
    consider: "Some advanced investment workflows need extra care",
    interface: "CLI + TUI + web",
  },
  {
    toolId: "ledger",
    bestFor: "Established CLI workflows and compatibility",
    strongestAt: "Mature expressions, reporting, and editor integrations",
    consider: "A smaller first-party onboarding and UI surface",
    interface: "CLI + community integrations",
  },
] as const satisfies readonly EngineComparison[];

export const knownStaleDestinations = [
  "https://github.com/e257-fi/tackler",
  "https://github.com/beancount/mole",
  "https://github.com/sdthomas69/Cashier",
  "https://github.com/eb3095/nanoledger",
  "https://github.com/tomszilagyi/banks2ledger",
  "https://github.com/moeffju/sublime-ledger",
  "https://beancount.io/docs/getting-started",
  "https://beancount.github.io/docs/beancount_cookbook.html",
  "https://hledger.org/tutorials.html",
] as const;

const knownStaleDestinationSet = new Set<string>(knownStaleDestinations);

export function validateCatalog(catalog: readonly CatalogTool[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const urls = new Set<string>();

  for (const tool of catalog) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) {
      errors.push(`${tool.id}: id must be a lowercase slug`);
    }
    if (ids.has(tool.id)) errors.push(`${tool.id}: duplicate id`);
    ids.add(tool.id);

    if (!tool.href.startsWith("https://")) {
      errors.push(`${tool.id}: destination must use HTTPS`);
    }
    if (urls.has(tool.href)) errors.push(`${tool.id}: duplicate destination`);
    urls.add(tool.href);

    if (knownStaleDestinationSet.has(tool.href)) {
      errors.push(`${tool.id}: destination is in the known-stale denylist`);
    }
    if (tool.formats.length === 0)
      errors.push(`${tool.id}: format is required`);
    if (tool.workflows.length === 0) {
      errors.push(`${tool.id}: workflow is required`);
    }
  }

  return errors;
}

const catalogErrors = validateCatalog(tools);
if (catalogErrors.length > 0) {
  throw new Error(`Invalid Awesome PTA catalog:\n${catalogErrors.join("\n")}`);
}
