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
    message: "Nenhum histórico de preços encontrado",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Este livro não registra preços, portanto não há histórico de taxas de câmbio para exibir.",
    description:
      "Empty state description when the ledger records no commodity prices",
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
