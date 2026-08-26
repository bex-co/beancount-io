import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "导出",
  markdown: "Markdown 报表",
  csv: "CSV 电子表格",
  printSavePdf: "打印 / 另存为 PDF",
  completed: "报表导出已就绪。",
  failed: "无法导出报表。",
  context: "范围与列报基础",
  generatedAt: "生成时间：{generatedAt}",
  asOf: "截至",
  period: "报告期间",
  accountFilter: "账户筛选",
  advancedFilter: "高级筛选",
  interval: "间隔",
  conversion: "换算",
  notApplied: "未应用",
  currency: "币种",
  unit: "单位",
  amount: "金额",
  unauditedManagementReport: "未经审计的管理层报表",
  unauditedMultiUnitManagementReport: "未经审计的多单位管理附表",
  unauditedInternalDraft: "未经审计的内部草稿",
  statementSummary: "报表摘要",
  lineItem: "项目",
  totalAssets: "资产总计",
  totalLiabilities: "负债总计",
  totalEquity: "权益总计",
  totalLiabilitiesAndEquity: "负债和权益总计",
  reconciliationDifference: "勾稽差额",
  totalRevenue: "收入及其他收益合计",
  totalExpenses: "费用合计",
  netLoss: "净损失",
  netCashOperating: "经营活动产生的现金流量净额",
  netCashInvesting: "投资活动产生的现金流量净额",
  netCashFinancing: "筹资活动产生的现金流量净额",
  netChangeInCash: "现金及现金等价物净变动",
  openingCash: "期初现金及现金等价物",
  closingCash: "期末现金及现金等价物",
  supportingAccountDetail: "账户明细附表",
  allActivity: "全部可用账本活动，截至",
  dateUnavailable: "无法确定报告日期",
  presentationCurrency: "列报币种",
  ledgerUnits: "显示的账本单位",
  sourceLedger: "来源账本",
  importantNotices: "重要提示",
  reportingEntity: "报告主体",
  netIncome: "净收益",
  reportingEntityFallbackNotice:
    '尚未配置报告主体，当前使用来源账本名称；对外使用前请设置 Beancount 的 option "title"。',
  placeholderDataNotice:
    "报告主体或来源账本看起来包含示例数据；对外使用前请替换。",
  inferredPeriodNotice:
    "本报表涵盖 {startDate} 至 {endDate} 的账本活动；日期由现有报表数据推导得出。",
  periodNotExplicitNotice: "无法确定完整的报告期间；本报表仍属于内部草稿。",
  inferredAsOfDateNotice:
    "未明确选择截止日期；本报表采用现有报表数据中的最晚日期：{asOfDate}。",
  asOfDateUnavailableNotice:
    "无法确定资产负债表截止日期；本报表仍属于内部草稿。",
  subtotalRowsNotice: "粗体行为小计或合计，不应与其下属明细行重复相加。",
  partialReportNotice: "账户或高级筛选限制了报表范围；本报表不是完整财务报表。",
  balanceSheetClassificationNotice:
    "来源账本未提供流动与非流动分类；账户按账本顺序列示。",
  balanceSheetDoesNotReconcileNotice:
    "一个或多个单位未满足会计恒等式。对外使用前，请复核未结转损益、局部筛选、估值或换算影响以及账本错误；本报表仍属于内部草稿。",
  cashFlowClassificationNotice:
    "对于未声明 cash-flow-role 的账户，经营、投资和筹资活动的划分依据账户类型和名称推断；已声明的账户按声明内容分类。",
  cashFlowCashEquivalentsNotice:
    "现金及现金等价物的范围根据账户名称推断（支票、储蓄等现金类资产账户）。对外使用前请核对包含的账户。",
  customUnitsNotice: "需要复核的自定义账本单位：",
  customUnitsDefinitionNotice:
    "本次导出未提供其含义；对外使用前请在随附附注中说明。",
  multiUnitScheduleNotice:
    "本多单位报表属于管理附表，并非单一列报币种的财务报表。不同单位的金额不得相加；对外使用前请选择列报币种。",
  noAssurance:
    "本报表不提供任何保证。报表根据用户提供的账本记录生成，主体身份、完整性、估值及会计准则合规性均未经验证。",
  generatedBy: "由 Beancount.io 于 {generatedAt} 生成",
});
