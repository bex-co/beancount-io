export interface TranslationEntry {
  message: string;
  description: string;
}

const faBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "بودجه",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "بودجه‌ها برای یک حساب اعمال می‌شوند، مثلاً Expenses:Food:Groceries. دستور جدیدتر برای همان حساب و ارز از تاریخ خود اعمال می‌شود.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "حساب الزامی است",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "افزودن بودجه",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "به‌روزرسانی بودجه",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "مبلغ",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "مبلغ الزامی است",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "ارز",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "ارز الزامی است",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "بودجه فعلی",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "تاریخ",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "آیا دستورالعمل بودجه {interval} به مبلغ {amount} برای {account} با تاریخ اثر {date} حذف شود؟ این کار یک ورودی بودجه را حذف می‌کند و قابل بازگشت نیست.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "حذف بودجه",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "در حال حذف...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "برای حساب‌های هزینه یا درآمد، اهداف تاریخ‌دار تعیین کنید. هر کارت فعالیت واقعی را با هدف فعال آن دوره مقایسه می‌کند.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "افزودن اولین بودجه",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "افزودن بودجه ناموفق بود",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "بازه زمانی",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "همه",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "روزانه",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "بازه",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "ماهانه",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "فصلی",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "هفتگی",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "سالانه",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "آخرین مقدار واقعی",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "هیچ بودجه‌ای یافت نشد",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "یک دستورالعمل بودجه ایجاد کنید تا ردیابی اهداف هزینه‌ای حساب‌های خود را آغاز کنید.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "داده‌ای موجود نیست",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "در هدف",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "بالاتر از هدف",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "جستجوی بودجه‌ها بر اساس حساب...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "انتخاب بازه زمانی",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "واقعی",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "تمام مدت",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "بازه زمانی",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "۱۲ ماه گذشته",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "سال گذشته",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "امسال",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "پایین‌تر از هدف",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "اختلاف",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default faBudget;
