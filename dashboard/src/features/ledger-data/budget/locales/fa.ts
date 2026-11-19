export interface TranslationEntry {
  message: string;
  description: string;
}

const faBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "به‌روزرسانی بودجه برای {account} ({currency})",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "حذف بودجه: {account}، {date}، {amount}، {interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "حذف بودجه: {account}، {date}، {amount}، {interval} (ردیف {position})",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "حساب (مثلاً Expenses:Food:Groceries)",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "اهداف درآمد به‌صورت مبلغ منفی ذخیره می‌شوند، همان‌طور که Beancount درآمد را ثبت می‌کند.",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "روزانه",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "هفتگی",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "ماهانه",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "فصلی",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "سالانه",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
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
      "برای یک حساب، مانند یک دسته هزینه یا درآمد، اهداف تاریخ‌دار تعیین کنید. هر کارت فعالیت واقعی را با هدف فعال آن دوره مقایسه می‌کند.",
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
  "page.budget.budgetPeriod": {
    message: "دوره",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "داده‌های دوره‌ای",
    description: "Disclosure label for the budget chart's period data table",
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
  "page.budget.budgetCount_one": {
    message: "{shown} بودجه",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_other": {
    message: "{shown} بودجه",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "فصل {quarter} {year}",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "هفتهٔ {date}",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "از {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "هیچ حساب دارای بودجه‌ای شامل «{query}» نیست.",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "در دفتر شما چیزی تغییر نکرده است. دوباره امتحان کنید یا یک دقیقه دیگر برگردید.",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "ابتدا هدف‌های ازدست‌رفته، سپس هدف‌های محقق‌شده، سپس آن‌هایی که هنوز در جریان‌اند؛ در هر گروه، بیشترین درصد فاصله از هدف در ابتدا.",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "ثبت‌ها در {date} تمام می‌شوند، پس ارقام مربوط به {day}، پایان آخرین ماه کامل، هستند.",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "هدف‌ها",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message:
      "هر هدف از تاریخ خود تا هدف بعدی برقرار است و همه با هم خط‌چین را می‌سازند.",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "بازگشت به خلاصه",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message: "ثبت‌ها در {date} تمام می‌شوند، پیش از آغاز این بازهٔ زمانی.",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "در جریان",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "هدف محقق نشد",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "بدون ارزیابی",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default faBudget;
