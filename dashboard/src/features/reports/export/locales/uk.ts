import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Експортувати",
  markdown: "Звіт Markdown",
  csv: "Таблиця CSV",
  printSavePdf: "Друк / Зберегти як PDF",
  completed: "Експорт звіту готовий.",
  failed: "Не вдалося експортувати звіт.",
  context: "Обсяг і основа подання",
  generatedAt: "Створено: {generatedAt}",
  asOf: "Станом на",
  period: "За період",
  accountFilter: "Фільтр рахунку",
  advancedFilter: "Розширений фільтр",
  interval: "Інтервал",
  conversion: "Конвертація",
  notApplied: "Не застосовано",
  currency: "Валюта",
  unit: "Одиниця",
  amount: "Сума",
  unauditedManagementReport: "Неаудований управлінський звіт",
  unauditedMultiUnitManagementReport:
    "Неаудована управлінська відомість у кількох одиницях",
  unauditedInternalDraft: "Неаудована внутрішня чернетка",
  statementSummary: "Короткий звіт",
  lineItem: "Стаття",
  totalAssets: "Усього активи",
  totalLiabilities: "Усього зобов’язання",
  totalEquity: "Усього капітал",
  totalLiabilitiesAndEquity: "Усього зобов’язання та капітал",
  reconciliationDifference: "Різниця звірки",
  totalRevenue: "Усього виручка та інші доходи",
  totalExpenses: "Усього витрати",
  netLoss: "Чистий збиток",
  supportingAccountDetail: "Додаткова деталізація рахунків",
  allActivity: "Уся доступна активність книги до",
  dateUnavailable: "Дата звіту недоступна",
  presentationCurrency: "Валюта подання",
  ledgerUnits: "Показані одиниці книги",
  sourceLedger: "Вихідна книга",
  importantNotices: "Важливі зауваження",
  reportingEntity: "Звітний суб’єкт",
  netIncome: "Чистий дохід",
  reportingEntityFallbackNotice:
    'Звітний суб’єкт не налаштований. Використовується назва вихідної книги; перед зовнішнім використанням задайте Beancount option "title".',
  placeholderDataNotice:
    "Звітний суб’єкт або вихідна книга, ймовірно, містить демонстраційні дані. Замініть їх перед зовнішнім використанням.",
  inferredPeriodNotice:
    "Цей звіт охоплює операції книги з {startDate} до {endDate}. Дати визначено за доступними даними звіту.",
  periodNotExplicitNotice:
    "Повний звітний період визначити не вдалося. Цей звіт залишається внутрішньою чернеткою.",
  inferredAsOfDateNotice:
    "Явну звітну дату не вибрано. Використовується остання доступна дата звіту: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Не вдалося визначити дату балансу. Цей звіт залишається внутрішньою чернеткою.",
  subtotalRowsNotice:
    "Рядки, виділені жирним, є проміжними або підсумковими сумами; їх не слід додавати до відповідних рядків деталізації.",
  partialReportNotice:
    "Фільтри рахунку або розширені фільтри обмежують звіт; це не повний фінансовий звіт.",
  balanceSheetClassificationNotice:
    "Вихідна книга не містить класифікації на оборотні й необоротні статті; рахунки подано в порядку книги.",
  balanceSheetDoesNotReconcileNotice:
    "Бухгалтерське рівняння не узгоджується для однієї або кількох одиниць. Перед зовнішнім використанням перевірте незакриті результати, часткові фільтри, вплив оцінки або перерахунку та помилки книги. Звіт залишається внутрішньою чернеткою.",
  customUnitsNotice: "Користувацькі одиниці, що потребують перевірки:",
  customUnitsDefinitionNotice:
    "Їх значення не наведено в цьому експорті; перед зовнішнім використанням опишіть їх у супровідній примітці.",
  multiUnitScheduleNotice:
    "Цей звіт у кількох одиницях є управлінською відомістю, а не фінансовим звітом в одній валюті подання. Не додавайте суми в різних одиницях; перед зовнішнім використанням виберіть валюту подання.",
  noAssurance:
    "Упевненість не надається. Звіт підготовлено за даними користувача; особу суб’єкта, повноту, оцінку та відповідність стандартам не перевірено.",
  generatedBy: "Створено Beancount.io: {generatedAt}",
});
