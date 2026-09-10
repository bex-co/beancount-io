export interface TranslationEntry {
  message: string;
  description: string;
}

const ptCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Commodities",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Falha ao Carregar Commodities",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Nenhuma Commodity Encontrada",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Este livro-razão ainda não tem dados de preço de commodities.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Histórico de preços com {count} pontos de dados",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Mostrar histórico de preços de {pair}",
    description: "Botão para revelar a tabela de preços datados",
  },
  "page.commodities.hidePriceHistory": {
    message: "Ocultar histórico de preços de {pair}",
    description: "Botão para fechar a tabela de preços datados",
  },
  "page.commodities.priceHistoryDate": {
    message: "Data",
    description: "Cabeçalho da coluna de datas",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Preço ({quote})",
    description: "Cabeçalho da coluna de preços na moeda de cotação",
  },
};

export default ptCommodities;
