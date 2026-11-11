import type { TranslationEntry } from "@/i18n";

const skCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "História verzií",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commity",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Detaily commitu",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "zmenené súbory",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Zmeny",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Žiadne zmeny na zobrazenie",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "Súbor bol premenovaný bez zmien",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "Žiadne zmeny riadkov na zobrazenie",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "Rozdiel sa nepodarilo prečítať. Môže mať nesprávny formát.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Načítať veľký rozdiel",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "Načítať staršie commity",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "Vybraný commit nie je v načítanej histórii.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "Načítal sa {count} starší commit",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_few": {
    message: "Načítali sa {count} staršie commity",
    description:
      "Polite announcement after older commits are appended (few form)",
  },
  "commits.loadedOlder_many": {
    message: "Načítalo sa {count} staršieho commitu",
    description:
      "Polite announcement after older commits are appended (many form)",
  },
  "commits.loadedOlder_other": {
    message: "Načítalo sa {count} starších commitov",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "Nenašli sa žiadne commity",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit sa nenašiel",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Vyberte commit na zobrazenie detailov",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Načítava sa rozdiel...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Upozornenie: Tento rozdiel je veľmi veľký ({totalLines} riadkov). Zvýrazňovanie syntaxe bude deaktivované kvôli výkonu.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "súbor",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "súbory",
    description: "Plural form of file count",
  },
  "commits.additions": {
    message: "+{count}",
    description: "Label showing number of lines added",
  },
  "commits.deletions": {
    message: "-{count}",
    description: "Label showing number of lines deleted",
  },
};

export default skCommits;
