interface TranslationEntry {
  message: string;
  description: string;
}

type LedgerFormTranslationKey =
  | "page.dashboard.ledgerTemplate"
  | "page.dashboard.starterTemplate"
  | "page.dashboard.starterTemplateDescription"
  | "page.dashboard.sampleTemplate"
  | "page.dashboard.sampleTemplateDescription";

type LedgerFormLanguage =
  | "bg"
  | "ca"
  | "de"
  | "en"
  | "es"
  | "fa"
  | "fr"
  | "ja"
  | "ko"
  | "nl"
  | "pt"
  | "ru"
  | "sk"
  | "uk"
  | "zh";

const descriptions: Record<LedgerFormTranslationKey, string> = {
  "page.dashboard.ledgerTemplate": "Label for the ledger template picker",
  "page.dashboard.starterTemplate": "Name of the starter ledger template",
  "page.dashboard.starterTemplateDescription":
    "Description of the starter ledger template",
  "page.dashboard.sampleTemplate": "Name of the sample ledger template",
  "page.dashboard.sampleTemplateDescription":
    "Description of the detailed sample ledger template",
};

const messages: Record<
  LedgerFormLanguage,
  Record<LedgerFormTranslationKey, string>
> = {
  en: {
    "page.dashboard.ledgerTemplate": "Template",
    "page.dashboard.starterTemplate": "Starter template",
    "page.dashboard.starterTemplateDescription":
      "Standard accounts and one example transaction to get started.",
    "page.dashboard.sampleTemplate": "Sample ledger",
    "page.dashboard.sampleTemplateDescription":
      "A detailed multi-file ledger with realistic sample activity.",
  },
  bg: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Начален шаблон",
    "page.dashboard.starterTemplateDescription":
      "Стандартни сметки и една примерна транзакция за начало.",
    "page.dashboard.sampleTemplate": "Примерна книга",
    "page.dashboard.sampleTemplateDescription":
      "Подробна книга с няколко файла и реалистична примерна активност.",
  },
  ca: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.starterTemplate": "Plantilla inicial",
    "page.dashboard.starterTemplateDescription":
      "Comptes estàndard i una transacció d'exemple per començar.",
    "page.dashboard.sampleTemplate": "Llibre d'exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un llibre detallat de diversos fitxers amb activitat d'exemple realista.",
  },
  de: {
    "page.dashboard.ledgerTemplate": "Vorlage",
    "page.dashboard.starterTemplate": "Startvorlage",
    "page.dashboard.starterTemplateDescription":
      "Standardkonten und eine Beispieltransaktion für den Einstieg.",
    "page.dashboard.sampleTemplate": "Beispielhauptbuch",
    "page.dashboard.sampleTemplateDescription":
      "Ein detailliertes Hauptbuch mit mehreren Dateien und realistischen Beispieldaten.",
  },
  es: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.starterTemplate": "Plantilla inicial",
    "page.dashboard.starterTemplateDescription":
      "Cuentas estándar y una transacción de ejemplo para comenzar.",
    "page.dashboard.sampleTemplate": "Libro mayor de muestra",
    "page.dashboard.sampleTemplateDescription":
      "Un libro detallado con varios archivos y actividad de ejemplo realista.",
  },
  fa: {
    "page.dashboard.ledgerTemplate": "الگو",
    "page.dashboard.starterTemplate": "الگوی شروع",
    "page.dashboard.starterTemplateDescription":
      "حساب‌های استاندارد و یک تراکنش نمونه برای شروع.",
    "page.dashboard.sampleTemplate": "دفتر نمونه",
    "page.dashboard.sampleTemplateDescription":
      "یک دفتر تفصیلی چندفایلی با فعالیت نمونه واقع‌گرایانه.",
  },
  fr: {
    "page.dashboard.ledgerTemplate": "Modèle",
    "page.dashboard.starterTemplate": "Modèle de démarrage",
    "page.dashboard.starterTemplateDescription":
      "Des comptes standard et une transaction d’exemple pour commencer.",
    "page.dashboard.sampleTemplate": "Grand livre d’exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un grand livre détaillé à plusieurs fichiers avec une activité d’exemple réaliste.",
  },
  ja: {
    "page.dashboard.ledgerTemplate": "テンプレート",
    "page.dashboard.starterTemplate": "スターターテンプレート",
    "page.dashboard.starterTemplateDescription":
      "標準的な勘定科目とサンプル取引1件ですぐに始められます。",
    "page.dashboard.sampleTemplate": "サンプル元帳",
    "page.dashboard.sampleTemplateDescription":
      "現実的なサンプル取引を含む詳細な複数ファイルの元帳です。",
  },
  ko: {
    "page.dashboard.ledgerTemplate": "템플릿",
    "page.dashboard.starterTemplate": "시작 템플릿",
    "page.dashboard.starterTemplateDescription":
      "표준 계정과 예시 거래 한 건으로 시작합니다.",
    "page.dashboard.sampleTemplate": "샘플 원장",
    "page.dashboard.sampleTemplateDescription":
      "현실적인 샘플 활동이 포함된 상세한 다중 파일 원장입니다.",
  },
  nl: {
    "page.dashboard.ledgerTemplate": "Sjabloon",
    "page.dashboard.starterTemplate": "Startsjabloon",
    "page.dashboard.starterTemplateDescription":
      "Standaardrekeningen en één voorbeeldtransactie om te beginnen.",
    "page.dashboard.sampleTemplate": "Voorbeeldgrootboek",
    "page.dashboard.sampleTemplateDescription":
      "Een gedetailleerd grootboek met meerdere bestanden en realistische voorbeeldactiviteit.",
  },
  pt: {
    "page.dashboard.ledgerTemplate": "Modelo",
    "page.dashboard.starterTemplate": "Modelo inicial",
    "page.dashboard.starterTemplateDescription":
      "Contas padrão e uma transação de exemplo para começar.",
    "page.dashboard.sampleTemplate": "Livro-razão de exemplo",
    "page.dashboard.sampleTemplateDescription":
      "Um livro-razão detalhado com vários arquivos e atividade de exemplo realista.",
  },
  ru: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Начальный шаблон",
    "page.dashboard.starterTemplateDescription":
      "Стандартные счета и одна примерная транзакция для начала работы.",
    "page.dashboard.sampleTemplate": "Пример книги",
    "page.dashboard.sampleTemplateDescription":
      "Подробная книга из нескольких файлов с реалистичными примерами операций.",
  },
  sk: {
    "page.dashboard.ledgerTemplate": "Šablóna",
    "page.dashboard.starterTemplate": "Úvodná šablóna",
    "page.dashboard.starterTemplateDescription":
      "Štandardné účty a jedna vzorová transakcia na začiatok.",
    "page.dashboard.sampleTemplate": "Vzorová účtovná kniha",
    "page.dashboard.sampleTemplateDescription":
      "Podrobná viac-súborová účtovná kniha s realistickou vzorovou aktivitou.",
  },
  uk: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Початковий шаблон",
    "page.dashboard.starterTemplateDescription":
      "Стандартні рахунки й одна прикладна транзакція для початку.",
    "page.dashboard.sampleTemplate": "Приклад книги",
    "page.dashboard.sampleTemplateDescription":
      "Докладна книга з кількох файлів із реалістичними прикладами операцій.",
  },
  zh: {
    "page.dashboard.ledgerTemplate": "模板",
    "page.dashboard.starterTemplate": "入门模板",
    "page.dashboard.starterTemplateDescription":
      "包含标准账户和一笔示例交易，可快速开始。",
    "page.dashboard.sampleTemplate": "示例账本",
    "page.dashboard.sampleTemplateDescription":
      "包含逼真示例活动的详细多文件账本。",
  },
};

export const ledgerFormTranslations = Object.fromEntries(
  Object.entries(messages).map(([language, languageMessages]) => [
    language,
    Object.fromEntries(
      Object.entries(languageMessages).map(([key, message]) => [
        key,
        {
          message,
          description: descriptions[key as LedgerFormTranslationKey],
        },
      ]),
    ),
  ]),
) as Record<
  LedgerFormLanguage,
  Record<LedgerFormTranslationKey, TranslationEntry>
>;
