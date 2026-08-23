export interface TranslationEntry {
  message: string;
  description: string;
}

const faSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "تکمیل ورود شما به Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "در حال ورود",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "داشبورد Beancount شما. به دفاتر خود دسترسی پیدا کنید و داده‌های مالی خود را مدیریت کنید.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "داشبورد",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "هنگام بارگیری این صفحه خطایی رخ داد. لطفاً دوباره تلاش کنید یا به صفحه اصلی برگردید.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "خطا",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "رمز عبور Beancount.io خود را به صورت امن بازنشانی کنید. ما یک لینک یک‌بار مصرف برایتان ارسال می‌کنیم — سپس به دفترهای خود بازگردید.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "بازنشانی رمز عبور Beancount — دسترسی امن",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "حسابداری حرفه‌ای متن ساده با Beancount. مالیات را پیگیری کنید، دفاتر را مدیریت کنید و گزارش‌ها را با حسابداری قدرتمند، دقیق و قابل حسابرسی تولید کنید.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "داشبورد Beancount - حسابداری متن ساده",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message: "جزئیات حساب و تاریخچه تراکنش برای {accountName} در {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "با استفاده از هوش مصنوعی در مورد داده‌های مالی {ledgerName} سوال بپرسید. تراکنش‌ها را تحلیل کنید، موجودی حساب‌ها را بررسی کنید، روندها را درک کنید و بینش‌های حسابداری فوری دریافت کنید.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "پرسش درباره {ledgerName} - دستیار مالی هوش مصنوعی",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "گزارش ترازنامه برای {ledgerName}. دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام را به یک نگاه مشاهده کنید.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "ترازنامه - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "فهرست کالاها و قیمت‌ها برای {ledgerName}. ارزها، سهام و دارایی‌های دیگر را پیگیری کنید.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "کالاها - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "تاریخچه کامیت‌ها و کنترل نسخه را برای {ledgerName} مشاهده کنید. تغییرات فایل‌های دفتر خود را در طول زمان پیگیری کنید.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "کامیت‌ها - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerCommit.description": {
    message:
      "Changes in commit {shortSha} for {ledgerName}. Review modified files and diffs.",
    description: "Commit detail page meta description",
  },
  "seo.ledgerCommit.title": {
    message: "Commit {shortSha} - {ledgerName}",
    description: "Commit detail page title with short hash and ledger name",
  },

  "seo.ledgerDashboard.description": {
    message:
      "تمام دفاتر Beancount خود را مشاهده و مدیریت کنید. دفاتر جدید ایجاد کنید، به موارد موجود دسترسی پیدا کنید و سوابق مالی خود را سازماندهی کنید.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "دفاتر من",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "پیوست‌های اسناد و رسیدها برای {ledgerName}. فایل‌های پشتیبان را برای تراکنش‌های خود سازماندهی کنید.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "اسناد - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "خطاهای اعتبارسنجی و هشدارها برای {ledgerName}. مسائل در دفتر خود را بررسی و رفع کنید.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "خطاها - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "جدول زمانی رویدادها برای {ledgerName}. رویدادها و نقاط عطف مالی مهم را پیگیری کنید.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "رویدادها - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "فایل‌های حسابداری Beancount مربوط به {ledgerName} را مرور کنید.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "فایل‌ها - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "یک فایل جدید در {ledgerName} ایجاد کنید. حساب‌ها، تراکنش‌ها یا سایر ورودی‌های Beancount را اضافه کنید.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "ایجاد فایل - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "فایل‌ها را به {ledgerName} بارگذاری کنید. فایل‌ها یا اسناد موجود Beancount را وارد کنید.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "بارگذاری فایل‌ها - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "نمونه‌ها و الگوهای عمومی دفاتر Beancount را مرور کنید. الهام بگیرید برای راه‌اندازی پیگیری مالی خود.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "گالری دفاتر",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "دارایی‌های سرمایه‌گذاری و سبد سهام برای {ledgerName}. موقعیت‌ها و ارزیابی‌های فعلی را مشاهده کنید.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "دارایی‌ها - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "وارد کردن تراکنش‌ها به {ledgerName} از CSV، PDF، OFX یا تصاویر. تجزیه هوشمند با AI برای صورت‌حساب‌های بانکی و رسیدها.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "واردات هوشمند - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "گزارش صورت سود و زیان برای {ledgerName}. درآمد، هزینه‌ها و درآمد خالص را در طول زمان پیگیری کنید.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "صورت سود و زیان - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "دفتر روزنامه تراکنش برای {ledgerName}. تمام ورودی‌های حسابداری خود را مشاهده، جستجو و فیلتر کنید.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "دفتر روزنامه - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "نمای کلی مالی و گزارش‌ها برای {ledgerName}. خالص دارایی، درآمد، هزینه‌ها و توزیع دارایی را مشاهده کنید.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "نمای کلی - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "تغییرات پول‌ریکوئست برای {ledgerName} را بررسی کنید. اصلاحات پیشنهادی دفتر خود را تأیید یا رد کنید.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "پول‌ریکوئست شماره {prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "حساب‌های بانکی را به {ledgerName} با استفاده از Plaid متصل کنید. تراکنش‌ها را به صورت خودکار وارد کنید و داده‌های مالی را همگام‌سازی کنید.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "حساب‌های متصل - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "{ledgerName} را با نحو BQL جستجو کنید. پرس‌وجوهای سفارشی را اجرا کنید و داده‌های مالی خود را تجزیه و تحلیل کنید.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "پرس‌وجوی BQL - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "تنظیمات دفتر را برای {ledgerName} پیکربندی کنید. ترجیحات، دسترسی و گزینه‌های دفتر را مدیریت کنید.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "تنظیمات دفتر - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "تحلیل آماری برای {ledgerName}. معیارها، روندها و بینش‌ها را از داده‌های مالی خود مشاهده کنید.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "آمار - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "گزارش تراز آزمایشی برای {ledgerName}. برابری بدهکار و بستانکار در حساب‌های خود را تأیید کنید.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "تراز آزمایشی - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "وارد Beancount.io شوید — حسابداری متن ساده متن‌باز با Git. دفترها را مدیریت کنید، بانک‌ها را وارد کنید و دفاتر خود را قابل حسابرسی نگه دارید.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "ورود به Beancount — حسابداری متن ساده رایگان",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "خروج از حساب Beancount شما.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "خروج",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "صفحه‌ای که به دنبال آن هستید وجود ندارد. ممکن است جابجا یا حذف شده باشد.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "صفحه یافت نشد",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "یک رمز عبور جدید برای حساب Beancount خود ایجاد کنید.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "بازنشانی رمز عبور",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "اطلاعات نمایه، ترجیحات زبان و تنظیمات عمومی حساب خود را به‌روزرسانی کنید.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "تنظیمات عمومی",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "کلیدهای SSH را برای دسترسی امن به دفاتر Beancount خود از طریق Git مدیریت کنید.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "کلیدهای SSH",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "منطقه خطر",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "اقدامات مخرب حساب مانند حذف دائمی حساب و تمام داده‌ها را مدیریت کنید.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "حساب رایگان Beancount.io خود را بسازید. امور مالی خود را با دفترهای متن ساده، گزارش‌های Fava، واردات بانکی و کنترل نسخه پیگیری کنید — بدون وابستگی.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "ایجاد حساب رایگان Beancount — حسابداری با Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "آدرس ایمیل خود را تأیید کنید تا ثبت‌نام حساب Beancount خود را کامل کنید.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "تأیید ایمیل",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "خوش آمدید to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "خوش آمدید",
    description: "Welcome page title",
  },
};

export default faSeo;
