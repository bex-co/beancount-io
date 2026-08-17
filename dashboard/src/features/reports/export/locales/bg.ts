import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Експортиране",
  markdown: "Markdown отчет",
  csv: "Електронна таблица CSV",
  printSavePdf: "Печат / Запазване като PDF",
  completed: "Експортът на отчета е готов.",
  failed: "Отчетът не можа да бъде експортиран.",
  context: "Обхват и база",
  generatedAt: "Генериран на {generatedAt}",
  asOf: "Към",
  period: "За периода",
  accountFilter: "Филтър по сметка",
  advancedFilter: "Разширен филтър",
  interval: "Интервал",
  conversion: "Преобразуване",
  notApplied: "Не е приложен",
  currency: "Валута",
  unit: "Единица",
  amount: "Сума",
  unauditedManagementReport: "Неодитиран управленски отчет",
  unauditedMultiUnitManagementReport:
    "Неодитирана управленска справка в няколко единици",
  unauditedInternalDraft: "Неодитирана вътрешна чернова",
  statementSummary: "Обобщение на отчета",
  lineItem: "Позиция",
  totalAssets: "Общо активи",
  totalLiabilities: "Общо пасиви",
  totalEquity: "Общо собствен капитал",
  totalLiabilitiesAndEquity: "Общо пасиви и собствен капитал",
  reconciliationDifference: "Разлика при съгласуване",
  totalRevenue: "Общо приходи и други доходи",
  totalExpenses: "Общо разходи",
  netLoss: "Нетна загуба",
  supportingAccountDetail: "Приложение с подробности по сметки",
  allActivity: "Цялата налична дейност в счетоводната книга до",
  dateUnavailable: "Датата на отчета не е налична",
  presentationCurrency: "Валута на представяне",
  ledgerUnits: "Показани единици от счетоводната книга",
  sourceLedger: "Изходна счетоводна книга",
  importantNotices: "Важни бележки",
  reportingEntity: "Отчитащ се субект",
  netIncome: "Нетен доход",
  reportingEntityFallbackNotice:
    'Не е зададен отчетен субект. Използва се името на изходната счетоводна книга; задайте Beancount option "title" преди външна употреба.',
  placeholderDataNotice:
    "Отчетният субект или изходната книга изглежда съдържа примерни данни. Заменете ги преди външна употреба.",
  inferredPeriodNotice:
    "Този отчет обхваща счетоводната дейност от {startDate} до {endDate}. Датите са изведени от наличните данни в отчета.",
  periodNotExplicitNotice:
    "Не може да се определи пълен отчетен период. Този отчет остава вътрешна чернова.",
  inferredAsOfDateNotice:
    "Не е избрана изрична дата на отчета. Използва се последната налична дата в отчета: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Не може да се определи дата на баланса. Този отчет остава вътрешна чернова.",
  subtotalRowsNotice:
    "Удебелените редове са междинни или крайни суми и не трябва да се събират с подробните редове под тях.",
  partialReportNotice:
    "Филтрите по сметка или разширените филтри ограничават отчета; той не е пълен финансов отчет.",
  balanceSheetClassificationNotice:
    "Изходната счетоводна книга не предоставя класификация на текущи и нетекущи позиции; сметките са представени по реда в книгата.",
  balanceSheetDoesNotReconcileNotice:
    "Счетоводното равенство не се съгласува за една или повече единици. Преди външна употреба прегледайте неприключени резултати, частични филтри, ефекти от оценка или превалутиране и грешки в книгата. Отчетът остава вътрешна чернова.",
  customUnitsNotice: "Потребителски единици за преглед:",
  customUnitsDefinitionNotice:
    "Значенията им не са налични в този експорт; опишете ги в придружаваща бележка преди външна употреба.",
  multiUnitScheduleNotice:
    "Този отчет в няколко единици е управленска справка, а не финансов отчет в една валута на представяне. Не събирайте суми от различни единици; изберете валута на представяне преди външна употреба.",
  noAssurance:
    "Не се предоставя увереност. Отчетът е изготвен от предоставени от потребителя записи; самоличността на субекта, пълнотата, оценката и съответствието не са проверени.",
  generatedBy: "Генерирано от Beancount.io на {generatedAt}",
});
