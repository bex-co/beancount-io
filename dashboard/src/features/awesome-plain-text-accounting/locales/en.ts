export interface TranslationEntry {
  message: string;
  description: string;
}

const enAwesome: Record<string, TranslationEntry> = {
  "awesome.skipToContent": {
    message: "Skip to main content",
    description: "Accessibility link that skips the page header",
  },
  "awesome.nav.compare": {
    message: "Compare",
    description: "Navigation link to engine comparison",
  },
  "awesome.nav.stack": {
    message: "Build a stack",
    description: "Navigation link to stack journey",
  },
  "awesome.nav.catalog": {
    message: "Browse tools",
    description: "Navigation link to the tool catalog",
  },
  "awesome.nav.method": {
    message: "Method",
    description: "Navigation link to curation method",
  },
  "awesome.nav.startFree": {
    message: "Start free",
    description: "Header call to action for Beancount.io registration",
  },
  "awesome.nav.sections": {
    message: "Page sections",
    description: "Accessible label for the directory section navigation",
  },
  "awesome.hero.eyebrow": {
    message: "{count} maintained resources · reviewed {date}",
    description: "Catalog size and review date shown above the page title",
  },
  "awesome.hero.title": {
    message: "Choose your plain-text accounting stack",
    description: "Main page heading",
  },
  "awesome.hero.subtitle": {
    message:
      "Compare accounting engines, then assemble the editors, importers, reports, and mobile tools that fit the way you work.",
    description: "Main page summary",
  },
  "awesome.hero.disclosure": {
    message:
      "Curated by Beancount.io, a hosted Beancount service. Competing tools follow the same published criteria, and affiliated listings are labeled.",
    description: "Curator affiliation disclosure",
  },
  "awesome.hero.compareCta": {
    message: "Compare core tools",
    description: "Primary hero action",
  },
  "awesome.hero.browseCta": {
    message: "Browse all tools",
    description: "Secondary hero action",
  },
  "awesome.chooser.eyebrow": {
    message: "Start with your goal",
    description: "Eyebrow above workflow chooser",
  },
  "awesome.chooser.title": {
    message: "What brings you to plain-text accounting?",
    description: "Workflow chooser heading",
  },
  "awesome.chooser.subtitle": {
    message:
      "Pick a starting point and we will narrow the directory without hiding the alternatives.",
    description: "Workflow chooser explanation",
  },
  "awesome.chooser.action": {
    message: "Show matching tools",
    description: "Action shown on each workflow choice",
  },
  "awesome.workflow.newcomer.title": {
    message: "I am starting my first ledger",
    description: "Newcomer workflow title",
  },
  "awesome.workflow.newcomer.description": {
    message:
      "Prioritize clear documentation, guided setup, and approachable interfaces.",
    description: "Newcomer workflow description",
  },
  "awesome.workflow.automation.title": {
    message: "I want to automate my books",
    description: "Automation workflow title",
  },
  "awesome.workflow.automation.description": {
    message: "Find scriptable engines, import frameworks, and editor tooling.",
    description: "Automation workflow description",
  },
  "awesome.workflow.investing.title": {
    message: "I track investments",
    description: "Investing workflow title",
  },
  "awesome.workflow.investing.description": {
    message: "Focus on lots, cost basis, prices, portfolios, and rich reports.",
    description: "Investing workflow description",
  },
  "awesome.workflow.selfHosting.title": {
    message: "I want everything on my machines",
    description: "Self-hosting workflow title",
  },
  "awesome.workflow.selfHosting.description": {
    message: "Choose local-first software with documented, portable workflows.",
    description: "Self-hosting workflow description",
  },
  "awesome.workflow.mobile.title": {
    message: "I need mobile entry",
    description: "Mobile workflow title",
  },
  "awesome.workflow.mobile.description": {
    message:
      "Find phone-friendly entry and hosted or export-based companion apps.",
    description: "Mobile workflow description",
  },
  "awesome.compare.eyebrow": {
    message: "Choose the foundation",
    description: "Eyebrow above engine comparison",
  },
  "awesome.compare.title": {
    message: "Beancount, hledger, or Ledger?",
    description: "Engine comparison title",
  },
  "awesome.compare.subtitle": {
    message:
      "All three keep durable plain-text books. The meaningful choice is which syntax, workflow, and surrounding tools you want to live with.",
    description: "Engine comparison explanation",
  },
  "awesome.compare.engine": {
    message: "Engine",
    description: "Comparison table engine column",
  },
  "awesome.compare.bestFor": {
    message: "Best fit",
    description: "Comparison table best-fit column",
  },
  "awesome.compare.strongestAt": {
    message: "Strongest at",
    description: "Comparison table strengths column",
  },
  "awesome.compare.consider": {
    message: "Consider",
    description: "Comparison table tradeoff column",
  },
  "awesome.compare.interface": {
    message: "Interfaces",
    description: "Comparison table interfaces column",
  },
  "awesome.compare.openProject": {
    message: "Open project",
    description: "Link from comparison to engine project",
  },
  "awesome.hosted.eyebrow": {
    message: "Managed Beancount option",
    description: "Eyebrow on hosted product callout",
  },
  "awesome.hosted.title": {
    message: "Prefer the stack assembled for you?",
    description: "Hosted product callout title",
  },
  "awesome.hosted.description": {
    message:
      "Beancount.io combines hosted Fava, Git-backed ledgers, imports, mobile apps, and AI workflows. Your accounting files remain plain text.",
    description: "Hosted product callout description",
  },
  "awesome.hosted.cta": {
    message: "Try Beancount.io free",
    description: "Hosted product call to action",
  },
  "awesome.hosted.source": {
    message: "Inspect the open-source clients",
    description: "Link to Beancount.io source code",
  },
  "awesome.stack.eyebrow": {
    message: "Build the workflow",
    description: "Eyebrow above stack journey",
  },
  "awesome.stack.title": {
    message: "One ledger, five layers",
    description: "Stack journey title",
  },
  "awesome.stack.subtitle": {
    message:
      "Start with an engine. Add only the entry, import, reporting, and mobile layers your routine actually needs.",
    description: "Stack journey summary",
  },
  "awesome.category.engine": {
    message: "Engine",
    description: "Engine category label",
  },
  "awesome.category.engineDescription": {
    message: "Defines the journal syntax and accounting rules.",
    description: "Engine category description",
  },
  "awesome.category.editor": {
    message: "Editor",
    description: "Editor category label",
  },
  "awesome.category.editorDescription": {
    message: "Makes daily text entry faster and safer.",
    description: "Editor category description",
  },
  "awesome.category.importer": {
    message: "Importer",
    description: "Importer category label",
  },
  "awesome.category.importerDescription": {
    message: "Turns statements and exports into reviewed entries.",
    description: "Importer category description",
  },
  "awesome.category.reporting": {
    message: "Reporting",
    description: "Reporting category label",
  },
  "awesome.category.reportingDescription": {
    message: "Explores balances, activity, budgets, and investments.",
    description: "Reporting category description",
  },
  "awesome.category.mobile": {
    message: "Mobile",
    description: "Mobile category label",
  },
  "awesome.category.mobileDescription": {
    message: "Captures or reviews transactions away from a desk.",
    description: "Mobile category description",
  },
  "awesome.catalog.eyebrow": {
    message: "Maintained directory",
    description: "Eyebrow above searchable catalog",
  },
  "awesome.catalog.title": {
    message: "Browse the ecosystem",
    description: "Catalog heading",
  },
  "awesome.catalog.subtitle": {
    message:
      "Search by need or combine category, format, and workflow filters. Every destination was reviewed on the date above.",
    description: "Catalog summary",
  },
  "awesome.catalog.searchLabel": {
    message: "Search tools",
    description: "Search input label",
  },
  "awesome.catalog.searchPlaceholder": {
    message: "Search names, capabilities, or tradeoffs",
    description: "Catalog search placeholder",
  },
  "awesome.catalog.categoryLabel": {
    message: "Layer",
    description: "Catalog category filter label",
  },
  "awesome.catalog.formatLabel": {
    message: "Accounting format",
    description: "Catalog format filter label",
  },
  "awesome.catalog.workflowLabel": {
    message: "Workflow",
    description: "Catalog workflow filter label",
  },
  "awesome.catalog.allCategories": {
    message: "All layers",
    description: "Unfiltered category option",
  },
  "awesome.catalog.allFormats": {
    message: "All formats",
    description: "Unfiltered format option",
  },
  "awesome.catalog.allWorkflows": {
    message: "All workflows",
    description: "Unfiltered workflow option",
  },
  "awesome.catalog.resultCount": {
    message: "Showing {count} of {total} resources",
    description: "Catalog result count",
  },
  "awesome.catalog.clearFilters": {
    message: "Clear filters",
    description: "Action that resets all catalog filters",
  },
  "awesome.catalog.emptyTitle": {
    message: "No tools match that combination",
    description: "Empty catalog result title",
  },
  "awesome.catalog.emptyDescription": {
    message: "Clear the filters or try a broader search.",
    description: "Empty catalog result guidance",
  },
  "awesome.catalog.bestFor": {
    message: "Best for",
    description: "Tool card best-for label",
  },
  "awesome.catalog.limitation": {
    message: "Know before choosing",
    description: "Tool card limitation label",
  },
  "awesome.catalog.openProject": {
    message: "Open project",
    description: "Tool card external link",
  },
  "awesome.catalog.affiliated": {
    message: "Beancount.io affiliated",
    description: "Badge for curator-affiliated listings",
  },
  "awesome.catalog.formatsAria": {
    message: "Supported formats and license",
    description: "Accessible label for tool format and license badges",
  },
  "awesome.catalog.local": {
    message: "Local",
    description: "Local delivery badge",
  },
  "awesome.catalog.hosted": {
    message: "Hosted",
    description: "Hosted delivery badge",
  },
  "awesome.catalog.both": {
    message: "Local + hosted",
    description: "Combined local and hosted delivery badge",
  },
  "awesome.format.beancount": {
    message: "Beancount",
    description: "Beancount format label",
  },
  "awesome.format.hledger": {
    message: "hledger",
    description: "hledger format label",
  },
  "awesome.format.ledger": {
    message: "Ledger",
    description: "Ledger format label",
  },
  "awesome.format.other": {
    message: "Other PTA format",
    description: "Other plain-text accounting format label",
  },
  "awesome.method.eyebrow": {
    message: "How curation works",
    description: "Eyebrow above methodology",
  },
  "awesome.method.title": {
    message: "Transparent by design",
    description: "Methodology section title",
  },
  "awesome.method.subtitle": {
    message:
      "This is a selective guide, not a popularity contest or an exhaustive mirror. Listings are reviewed against the same public rules.",
    description: "Methodology section summary",
  },
  "awesome.method.criteriaTitle": {
    message: "Inclusion criteria",
    description: "Inclusion criteria heading",
  },
  "awesome.method.criteriaOne": {
    message: "A working HTTPS project or documentation destination",
    description: "First inclusion criterion",
  },
  "awesome.method.criteriaTwo": {
    message: "A clear role in a plain-text accounting workflow",
    description: "Second inclusion criterion",
  },
  "awesome.method.criteriaThree": {
    message: "Enough maintenance evidence to recommend further evaluation",
    description: "Third inclusion criterion",
  },
  "awesome.method.criteriaFour": {
    message: "An honest best-fit statement and a meaningful limitation",
    description: "Fourth inclusion criterion",
  },
  "awesome.method.badgesTitle": {
    message: "What labels mean",
    description: "Badge methodology heading",
  },
  "awesome.method.badgeOne": {
    message: "Format labels describe files a tool reads or writes.",
    description: "Format label explanation",
  },
  "awesome.method.badgeTwo": {
    message: "Local and hosted labels describe how the tool is delivered.",
    description: "Delivery label explanation",
  },
  "awesome.method.badgeThree": {
    message:
      "Affiliated labels disclose Beancount.io products; they do not imply rank.",
    description: "Affiliation label explanation",
  },
  "awesome.contribute.title": {
    message: "See something missing or stale?",
    description: "Contribution callout title",
  },
  "awesome.contribute.description": {
    message:
      "Open a prefilled public issue with the project URL, supported format, use case, and maintenance evidence.",
    description: "Contribution callout description",
  },
  "awesome.contribute.cta": {
    message: "Suggest a tool or correction",
    description: "Contribution call to action",
  },
  "awesome.footer.description": {
    message:
      "Plain-text accounting keeps durable books in files you can inspect, version, and move.",
    description: "Footer product principle",
  },
  "awesome.footer.docs": {
    message: "Documentation",
    description: "Footer documentation link",
  },
  "awesome.footer.github": {
    message: "GitHub",
    description: "Footer source link",
  },
};

export default enAwesome;
