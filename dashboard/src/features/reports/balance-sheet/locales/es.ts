export interface TranslationEntry {
  message: string;
  description: string;
}

const esBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Jerarquía de activos",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Seguimiento de {ledgerName} activos en diferentes productos a lo largo del tiempo",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Jerarquía de patrimonio",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Realice un seguimiento de {ledgerName} patrimonio en diferentes productos a lo largo del tiempo",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Jerarquía de pasivos",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Seguimiento de {ledgerName} pasivos en diferentes productos a lo largo del tiempo",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Patrimonio neto mensual",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Seguimiento de {ledgerName} patrimonio neto en diferentes productos a lo largo del tiempo",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message:
      "No se encontraron datos de balance general para este libro mayor.",
    description: "Empty state message for balance sheet",
  },
};

export default esBalanceSheet;
