import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "برون‌بری",
  markdown: "گزارش Markdown",
  csv: "صفحه‌گسترده CSV",
  printSavePdf: "چاپ / ذخیره به‌صورت PDF",
  completed: "خروجی گزارش آماده است.",
  failed: "گزارش صادر نشد.",
  context: "دامنه و مبنای ارائه",
  generatedAt: "تولیدشده در {generatedAt}",
  asOf: "تا تاریخ",
  period: "برای دوره",
  accountFilter: "فیلتر حساب",
  advancedFilter: "فیلتر پیشرفته",
  interval: "بازه",
  conversion: "تبدیل",
  notApplied: "اعمال نشده",
  currency: "ارز",
  unit: "واحد",
  amount: "مبلغ",
  unauditedManagementReport: "گزارش مدیریتی حسابرسی‌نشده",
  unauditedMultiUnitManagementReport: "جدول مدیریتی چندواحدی حسابرسی‌نشده",
  unauditedInternalDraft: "پیش‌نویس داخلی حسابرسی‌نشده",
  statementSummary: "خلاصه صورت",
  lineItem: "قلم",
  totalAssets: "جمع دارایی‌ها",
  totalLiabilities: "جمع بدهی‌ها",
  totalEquity: "جمع حقوق مالکانه",
  totalLiabilitiesAndEquity: "جمع بدهی‌ها و حقوق مالکانه",
  reconciliationDifference: "اختلاف تطبیق",
  totalRevenue: "جمع درآمد و سایر عایدی‌ها",
  totalExpenses: "جمع هزینه‌ها",
  netLoss: "زیان خالص",
  netCashOperating: "جریان نقد خالص فعالیت‌های عملیاتی",
  netCashInvesting: "جریان نقد خالص فعالیت‌های سرمایه‌گذاری",
  netCashFinancing: "جریان نقد خالص فعالیت‌های تامین مالی",
  netChangeInCash: "تغییر خالص در وجه نقد و معادل‌های آن",
  openingCash: "وجه نقد و معادل‌های آن در ابتدای دوره",
  closingCash: "وجه نقد و معادل‌های آن در پایان دوره",
  supportingAccountDetail: "جزئیات پشتیبان حساب‌ها",
  allActivity: "تمام فعالیت موجود دفتر تا",
  dateUnavailable: "تاریخ گزارش در دسترس نیست",
  presentationCurrency: "ارز ارائه",
  ledgerUnits: "واحدهای نمایش‌داده‌شده دفتر",
  sourceLedger: "دفتر منبع",
  importantNotices: "نکات مهم",
  reportingEntity: "شخصیت گزارشگر",
  netIncome: "درآمد خالص",
  reportingEntityFallbackNotice:
    'شخصیت گزارشگر تنظیم نشده است. نام دفتر منبع استفاده می‌شود؛ پیش از استفاده خارجی، option "title" در Beancount را تنظیم کنید.',
  placeholderDataNotice:
    "شخصیت گزارشگر یا دفتر منبع ظاهراً شامل داده‌های نمونه است. پیش از استفاده خارجی آن را جایگزین کنید.",
  inferredPeriodNotice:
    "این گزارش فعالیت دفتر را از {startDate} تا {endDate} پوشش می‌دهد. تاریخ‌ها از داده‌های موجود گزارش استخراج شده‌اند.",
  periodNotExplicitNotice:
    "دوره کامل گزارش قابل تعیین نبود. این گزارش همچنان پیش‌نویس داخلی است.",
  inferredAsOfDateNotice:
    "تاریخ مشخصی برای صورت انتخاب نشده است. این صورت از آخرین تاریخ موجود در گزارش استفاده می‌کند: {asOfDate}.",
  asOfDateUnavailableNotice:
    "تاریخ صورت وضعیت مالی قابل تعیین نبود. این صورت همچنان پیش‌نویس داخلی است.",
  subtotalRowsNotice:
    "ردیف‌های پررنگ جمع‌های فرعی یا کل هستند و نباید با ردیف‌های جزئیات زیرمجموعه جمع شوند.",
  partialReportNotice:
    "فیلتر حساب یا فیلتر پیشرفته دامنه این گزارش را محدود کرده است؛ این صورت مالی کامل نیست.",
  balanceSheetClassificationNotice:
    "دفتر منبع طبقه‌بندی جاری و غیرجاری را ارائه نمی‌کند؛ حساب‌ها به ترتیب دفتر نمایش داده می‌شوند.",
  balanceSheetDoesNotReconcileNotice:
    "معادله حسابداری برای یک یا چند واحد تطبیق ندارد. پیش از استفاده خارجی، نتایج بسته‌نشده، فیلترهای جزئی، آثار ارزش‌گذاری یا تبدیل و خطاهای دفتر را بررسی کنید. این صورت همچنان پیش‌نویس داخلی است.",
  cashFlowClassificationNotice:
    "فعالیت‌های عملیاتی، سرمایه‌گذاری و تامین مالی برای حساب‌های بدون cash-flow-role اعلام‌شده از نوع و نام حساب‌ها استنباط می‌شوند؛ حساب‌هایی که آن را اعلام کرده‌اند همان‌طور که نوشته شده طبقه‌بندی می‌شوند.",
  cashFlowCashEquivalentsNotice:
    "مجموعه وجه نقد و معادل‌های آن از نام حساب‌ها استنباط می‌شود (حساب‌های جاری، پس‌انداز و حساب‌های نقدی مشابه). حساب‌های شامل‌شده را قبل از استفاده خارجی بازبینی کنید.",
  customUnitsNotice: "واحدهای سفارشی نیازمند بررسی:",
  customUnitsDefinitionNotice:
    "معنای آن‌ها در این خروجی موجود نیست؛ پیش از استفاده خارجی، آن‌ها را در یادداشت همراه مستند کنید.",
  multiUnitScheduleNotice:
    "این گزارش چندواحدی یک جدول مدیریتی است، نه صورت مالی با یک ارز ارائه. مبالغ واحدهای مختلف را با هم جمع نکنید؛ پیش از استفاده خارجی ارز ارائه را انتخاب کنید.",
  noAssurance:
    "هیچ اطمینانی ارائه نمی‌شود. گزارش از سوابق ارائه‌شده توسط کاربر تهیه شده و هویت، کامل‌بودن، ارزش‌گذاری و انطباق حسابداری تأیید نشده است.",
  generatedBy: "تولیدشده توسط Beancount.io در {generatedAt}",
});
