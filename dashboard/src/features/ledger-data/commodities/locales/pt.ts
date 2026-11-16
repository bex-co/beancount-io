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
  "page.commodities.managedSources": {
    message: "Fontes de preços gerenciadas",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Preços que este livro inclui de uma fonte gerenciada. Eles são atualizados a cada poucos minutos; suas próprias entradas de preço têm prioridade.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Atualizado",
    description:
      "Freshness badge: the managed feed's newest price is at most seven days old",
  },
  "page.commodities.freshness.stale": {
    message: "Desatualizado",
    description:
      "Freshness badge: the managed feed's newest price is more than seven days old",
  },
  "page.commodities.freshness.unavailable": {
    message: "Indisponível",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.latestPriceDate": {
    message: "Último preço {date}",
    description:
      "Date of the managed feed's newest price. {date} is a formatted date.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Próxima atualização {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Nenhum preço recebido ainda",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Último erro: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Atualizar preços",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Atualizando…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Não foi possível atualizar os preços",
    description: "Toast shown when refreshing managed prices fails",
  },
  "page.commodities.chartsReloadFailed": {
    message:
      "Os preços foram atualizados, mas não foi possível recarregar os gráficos.",
    description:
      "Shown on the managed price sources card when a refresh was acknowledged but reading the price charts again failed",
  },
  "page.commodities.reloadCharts": {
    message: "Recarregar gráficos",
    description:
      "Button that reads the price charts again after a failed reload, without refreshing the managed feeds",
  },
};

export default ptCommodities;
