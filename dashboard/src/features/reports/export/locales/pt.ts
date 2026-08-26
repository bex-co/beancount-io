import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exportar",
  markdown: "Relatório Markdown",
  csv: "Folha de cálculo CSV",
  printSavePdf: "Imprimir / Guardar como PDF",
  completed: "A exportação do relatório está pronta.",
  failed: "Não foi possível exportar o relatório.",
  context: "Âmbito e base",
  generatedAt: "Gerado em {generatedAt}",
  asOf: "Em",
  period: "Para o período",
  accountFilter: "Filtro de conta",
  advancedFilter: "Filtro avançado",
  interval: "Intervalo",
  conversion: "Conversão",
  notApplied: "Não aplicado",
  currency: "Moeda",
  unit: "Unidade",
  amount: "Montante",
  unauditedManagementReport: "Relatório de gestão não auditado",
  unauditedMultiUnitManagementReport:
    "Anexo de gestão multiunidade não auditado",
  unauditedInternalDraft: "Rascunho interno não auditado",
  statementSummary: "Resumo da demonstração",
  lineItem: "Rubrica",
  totalAssets: "Total do ativo",
  totalLiabilities: "Total do passivo",
  totalEquity: "Total do capital próprio",
  totalLiabilitiesAndEquity: "Total do passivo e capital próprio",
  reconciliationDifference: "Diferença de reconciliação",
  totalRevenue: "Total de rendimentos e outros proveitos",
  totalExpenses: "Total de gastos",
  netLoss: "Prejuízo líquido",
  netCashOperating: "Fluxo de Caixa Líquido das Atividades Operacionais",
  netCashInvesting: "Fluxo de Caixa Líquido das Atividades de Investimento",
  netCashFinancing: "Fluxo de Caixa Líquido das Atividades de Financiamento",
  netChangeInCash: "Variação Líquida de Caixa e Equivalentes",
  openingCash: "Caixa e Equivalentes no Início do Período",
  closingCash: "Caixa e Equivalentes no Fim do Período",
  supportingAccountDetail: "Detalhe complementar de contas",
  allActivity: "Toda a atividade disponível do livro até",
  dateUnavailable: "Data do relatório indisponível",
  presentationCurrency: "Moeda de apresentação",
  ledgerUnits: "Unidades do livro apresentadas",
  sourceLedger: "Livro de origem",
  importantNotices: "Avisos importantes",
  reportingEntity: "Entidade relatora",
  netIncome: "Resultado líquido",
  reportingEntityFallbackNotice:
    'Não foi configurada uma entidade relatora. É usado o nome do livro de origem; defina a option "title" do Beancount antes da utilização externa.',
  placeholderDataNotice:
    "A entidade relatora ou o livro de origem parece conter dados de exemplo. Substitua-os antes da utilização externa.",
  inferredPeriodNotice:
    "Este relatório abrange a atividade do livro de {startDate} a {endDate}. As datas foram derivadas dos dados disponíveis do relatório.",
  periodNotExplicitNotice:
    "Não foi possível determinar um período de relato completo. Este relatório continua a ser um rascunho interno.",
  inferredAsOfDateNotice:
    "Não foi selecionada uma data de referência explícita. Esta demonstração usa a última data disponível no relatório: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Não foi possível determinar uma data de referência. Esta demonstração permanece um rascunho interno.",
  subtotalRowsNotice:
    "As linhas a negrito são subtotais ou totais e não devem ser somadas às linhas de detalhe subjacentes.",
  partialReportNotice:
    "Os filtros de conta ou avançados limitam este relatório; não é uma demonstração financeira completa.",
  balanceSheetClassificationNotice:
    "O livro de origem não fornece classificações correntes e não correntes; as contas são apresentadas na ordem do livro.",
  balanceSheetDoesNotReconcileNotice:
    "A equação contabilística não reconcilia para uma ou mais unidades. Reveja resultados não encerrados, filtros parciais, efeitos de valorização ou conversão e erros do livro antes da utilização externa. Esta demonstração permanece um rascunho interno.",
  cashFlowClassificationNotice:
    "As atividades operacionais, de investimento e de financiamento são inferidas dos tipos e nomes das contas sem um cash-flow-role declarado; as contas que o declaram são classificadas conforme escrito.",
  cashFlowCashEquivalentsNotice:
    "O conjunto de caixa e equivalentes é inferido dos nomes das contas (contas correntes, poupança e contas de caixa semelhantes). Revise as contas incluídas antes do uso externo.",
  customUnitsNotice: "Unidades personalizadas que exigem revisão:",
  customUnitsDefinitionNotice:
    "Os seus significados não estão disponíveis nesta exportação; documente-os numa nota anexa antes da utilização externa.",
  multiUnitScheduleNotice:
    "Este relatório multiunidade é um anexo de gestão, não uma demonstração financeira numa única moeda de apresentação. Não some montantes entre unidades; selecione uma moeda de apresentação antes da utilização externa.",
  noAssurance:
    "Não é fornecida qualquer garantia. O relatório foi preparado com registos fornecidos pelo utilizador; a identidade, integridade, avaliação e conformidade contabilística não foram verificadas.",
  generatedBy: "Gerado por Beancount.io em {generatedAt}",
});
