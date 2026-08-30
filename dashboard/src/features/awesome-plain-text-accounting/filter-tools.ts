import type {
  AccountingFormat,
  CatalogTool,
  ToolCategory,
  Workflow,
} from "./catalog";

export interface CatalogFilters {
  query: string;
  category: ToolCategory | "all";
  format: AccountingFormat | "all";
  workflow: Workflow | "all";
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  category: "all",
  format: "all",
  workflow: "all",
};

export function filterTools(
  catalog: readonly CatalogTool[],
  filters: CatalogFilters,
): CatalogTool[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return catalog.filter((tool) => {
    if (filters.category !== "all" && tool.category !== filters.category) {
      return false;
    }
    if (filters.format !== "all" && !tool.formats.includes(filters.format)) {
      return false;
    }
    if (
      filters.workflow !== "all" &&
      !tool.workflows.includes(filters.workflow)
    ) {
      return false;
    }
    if (!query) return true;

    return [
      tool.name,
      tool.summary,
      tool.bestFor,
      tool.limitation,
      tool.license,
      ...tool.formats,
      ...tool.workflows,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
}
