interface TranslationEntry {
  message: string;
  description: string;
}

type LedgerFormTranslationKey =
  | "page.dashboard.ledgerTemplate"
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
    "page.dashboard.sampleTemplate": "Sample ledger",
    "page.dashboard.sampleTemplateDescription":
      "A detailed multi-file ledger with realistic sample activity.",
  },
  bg: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.sampleTemplate": "Примерна книга",
    "page.dashboard.sampleTemplateDescription":
      "Подробна книга с няколко файла и реалистична примерна активност.",
  },
  ca: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.sampleTemplate": "Llibre d'exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un llibre detallat de diversos fitxers amb activitat d'exemple realista.",
  },
  de: {
    "page.dashboard.ledgerTemplate": "Vorlage",
    "page.dashboard.sampleTemplate": "Beispielhauptbuch",
    "page.dashboard.sampleTemplateDescription":
      "Ein detailliertes Hauptbuch mit mehreren Dateien und realistischen Beispieldaten.",
  },
  es: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.sampleTemplate": "Libro mayor de muestra",
    "page.dashboard.sampleTemplateDescription":
      "Un libro detallado con varios archivos y actividad de ejemplo realista.",
  },
  fa: {
    "page.dashboard.ledgerTemplate": "الگو",
    "page.dashboard.sampleTemplate": "دفتر نمونه",
    "page.dashboard.sampleTemplateDescription":
      "یک دفتر تفصیلی چندفایلی با فعالیت نمونه واقع‌گرایانه.",
  },
  fr: {
    "page.dashboard.ledgerTemplate": "Modèle",
    "page.dashboard.sampleTemplate": "Grand livre d’exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un grand livre détaillé à plusieurs fichiers avec une activité d’exemple réaliste.",
  },
  ja: {
    "page.dashboard.ledgerTemplate": "テンプレート",
    "page.dashboard.sampleTemplate": "サンプル元帳",
    "page.dashboard.sampleTemplateDescription":
      "現実的なサンプル取引を含む詳細な複数ファイルの元帳です。",
  },
  ko: {
    "page.dashboard.ledgerTemplate": "템플릿",
    "page.dashboard.sampleTemplate": "샘플 원장",
    "page.dashboard.sampleTemplateDescription":
      "현실적인 샘플 활동이 포함된 상세한 다중 파일 원장입니다.",
  },
  nl: {
    "page.dashboard.ledgerTemplate": "Sjabloon",
    "page.dashboard.sampleTemplate": "Voorbeeldgrootboek",
    "page.dashboard.sampleTemplateDescription":
      "Een gedetailleerd grootboek met meerdere bestanden en realistische voorbeeldactiviteit.",
  },
  pt: {
    "page.dashboard.ledgerTemplate": "Modelo",
    "page.dashboard.sampleTemplate": "Livro-razão de exemplo",
    "page.dashboard.sampleTemplateDescription":
      "Um livro-razão detalhado com vários arquivos e atividade de exemplo realista.",
  },
  ru: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.sampleTemplate": "Пример книги",
    "page.dashboard.sampleTemplateDescription":
      "Подробная книга из нескольких файлов с реалистичными примерами операций.",
  },
  sk: {
    "page.dashboard.ledgerTemplate": "Šablóna",
    "page.dashboard.sampleTemplate": "Vzorová účtovná kniha",
    "page.dashboard.sampleTemplateDescription":
      "Podrobná viac-súborová účtovná kniha s realistickou vzorovou aktivitou.",
  },
  uk: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.sampleTemplate": "Приклад книги",
    "page.dashboard.sampleTemplateDescription":
      "Докладна книга з кількох файлів із реалістичними прикладами операцій.",
  },
  zh: {
    "page.dashboard.ledgerTemplate": "模板",
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
