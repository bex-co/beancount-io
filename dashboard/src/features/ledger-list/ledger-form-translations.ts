interface TranslationEntry {
  message: string;
  description: string;
}

type LedgerFormTranslationKey =
  | "page.dashboard.ledgerTemplate"
  | "page.dashboard.starterTemplate"
  | "page.dashboard.starterTemplateDescription"
  | "page.dashboard.sampleTemplate"
  | "page.dashboard.sampleTemplateDescription"
  | "page.dashboard.ledgerCurrency"
  | "page.dashboard.ledgerCurrencyDescription"
  | "page.dashboard.ledgerCurrencyInvalid";

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
  "page.dashboard.ledgerCurrency":
    "Label for the operating-currency picker of a new Starter ledger",
  "page.dashboard.ledgerCurrencyDescription":
    "Hint under the new ledger's currency picker",
  "page.dashboard.ledgerCurrencyInvalid":
    "Validation message when the currency picker holds no listed currency",
};

const messages: Record<
  LedgerFormLanguage,
  Record<LedgerFormTranslationKey, string>
> = {
  en: {
    "page.dashboard.ledgerTemplate": "Template",
    "page.dashboard.starterTemplate": "Starter template",
    "page.dashboard.starterTemplateDescription":
      "Empty books with a standard chart of accounts.",
    "page.dashboard.sampleTemplate": "Sample ledger",
    "page.dashboard.sampleTemplateDescription":
      "A detailed multi-file ledger with realistic sample activity.",
    "page.dashboard.ledgerCurrency": "Currency",
    "page.dashboard.ledgerCurrencyDescription":
      "The currency your books report in. Accounts can still hold other currencies.",
    "page.dashboard.ledgerCurrencyInvalid": "Choose a currency from the list.",
  },
  bg: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Начален шаблон",
    "page.dashboard.starterTemplateDescription":
      "Празни книги със стандартен сметкоплан.",
    "page.dashboard.sampleTemplate": "Примерна книга",
    "page.dashboard.sampleTemplateDescription":
      "Подробна книга с няколко файла и реалистична примерна активност.",
    "page.dashboard.ledgerCurrency": "Валута",
    "page.dashboard.ledgerCurrencyDescription":
      "Валутата, в която се отчитат книгите. Сметките могат да съдържат и други валути.",
    "page.dashboard.ledgerCurrencyInvalid": "Изберете валута от списъка.",
  },
  ca: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.starterTemplate": "Plantilla inicial",
    "page.dashboard.starterTemplateDescription":
      "Llibres buits amb un pla de comptes estàndard.",
    "page.dashboard.sampleTemplate": "Llibre d'exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un llibre detallat de diversos fitxers amb activitat d'exemple realista.",
    "page.dashboard.ledgerCurrency": "Moneda",
    "page.dashboard.ledgerCurrencyDescription":
      "La moneda en què es presenten els llibres. Els comptes poden contenir altres monedes.",
    "page.dashboard.ledgerCurrencyInvalid": "Trieu una moneda de la llista.",
  },
  de: {
    "page.dashboard.ledgerTemplate": "Vorlage",
    "page.dashboard.starterTemplate": "Startvorlage",
    "page.dashboard.starterTemplateDescription":
      "Leere Bücher mit einem Standardkontenrahmen.",
    "page.dashboard.sampleTemplate": "Beispielhauptbuch",
    "page.dashboard.sampleTemplateDescription":
      "Ein detailliertes Hauptbuch mit mehreren Dateien und realistischen Beispieldaten.",
    "page.dashboard.ledgerCurrency": "Währung",
    "page.dashboard.ledgerCurrencyDescription":
      "Die Währung, in der Ihre Bücher berichten. Konten können weiterhin andere Währungen enthalten.",
    "page.dashboard.ledgerCurrencyInvalid":
      "Wählen Sie eine Währung aus der Liste.",
  },
  es: {
    "page.dashboard.ledgerTemplate": "Plantilla",
    "page.dashboard.starterTemplate": "Plantilla inicial",
    "page.dashboard.starterTemplateDescription":
      "Libros vacíos con un plan de cuentas estándar.",
    "page.dashboard.sampleTemplate": "Libro mayor de muestra",
    "page.dashboard.sampleTemplateDescription":
      "Un libro detallado con varios archivos y actividad de ejemplo realista.",
    "page.dashboard.ledgerCurrency": "Moneda",
    "page.dashboard.ledgerCurrencyDescription":
      "La moneda en la que se presentan sus libros. Las cuentas pueden contener otras monedas.",
    "page.dashboard.ledgerCurrencyInvalid": "Elija una moneda de la lista.",
  },
  fa: {
    "page.dashboard.ledgerTemplate": "الگو",
    "page.dashboard.starterTemplate": "الگوی شروع",
    "page.dashboard.starterTemplateDescription":
      "دفترهای خالی با یک نمودار حساب استاندارد.",
    "page.dashboard.sampleTemplate": "دفتر نمونه",
    "page.dashboard.sampleTemplateDescription":
      "یک دفتر تفصیلی چندفایلی با فعالیت نمونه واقع‌گرایانه.",
    "page.dashboard.ledgerCurrency": "ارز",
    "page.dashboard.ledgerCurrencyDescription":
      "ارزی که گزارش‌های دفتر با آن نمایش داده می‌شود. حساب‌ها همچنان می‌توانند ارزهای دیگری داشته باشند.",
    "page.dashboard.ledgerCurrencyInvalid": "یک ارز از فهرست انتخاب کنید.",
  },
  fr: {
    "page.dashboard.ledgerTemplate": "Modèle",
    "page.dashboard.starterTemplate": "Modèle de démarrage",
    "page.dashboard.starterTemplateDescription":
      "Livres vides avec un plan comptable standard.",
    "page.dashboard.sampleTemplate": "Grand livre d’exemple",
    "page.dashboard.sampleTemplateDescription":
      "Un grand livre détaillé à plusieurs fichiers avec une activité d’exemple réaliste.",
    "page.dashboard.ledgerCurrency": "Devise",
    "page.dashboard.ledgerCurrencyDescription":
      "La devise dans laquelle vos livres sont présentés. Les comptes peuvent contenir d'autres devises.",
    "page.dashboard.ledgerCurrencyInvalid":
      "Choisissez une devise dans la liste.",
  },
  ja: {
    "page.dashboard.ledgerTemplate": "テンプレート",
    "page.dashboard.starterTemplate": "スターターテンプレート",
    "page.dashboard.starterTemplateDescription":
      "標準の勘定科目表を持つ空の帳簿です。",
    "page.dashboard.sampleTemplate": "サンプル元帳",
    "page.dashboard.sampleTemplateDescription":
      "現実的なサンプル取引を含む詳細な複数ファイルの元帳です。",
    "page.dashboard.ledgerCurrency": "通貨",
    "page.dashboard.ledgerCurrencyDescription":
      "帳簿のレポートに使う通貨です。勘定科目では他の通貨も使えます。",
    "page.dashboard.ledgerCurrencyInvalid": "一覧から通貨を選んでください。",
  },
  ko: {
    "page.dashboard.ledgerTemplate": "템플릿",
    "page.dashboard.starterTemplate": "시작 템플릿",
    "page.dashboard.starterTemplateDescription":
      "표준 계정과목표를 갖춘 빈 장부입니다.",
    "page.dashboard.sampleTemplate": "샘플 원장",
    "page.dashboard.sampleTemplateDescription":
      "현실적인 샘플 활동이 포함된 상세한 다중 파일 원장입니다.",
    "page.dashboard.ledgerCurrency": "통화",
    "page.dashboard.ledgerCurrencyDescription":
      "장부 보고에 사용하는 통화입니다. 계정에는 다른 통화도 담을 수 있습니다.",
    "page.dashboard.ledgerCurrencyInvalid": "목록에서 통화를 선택하세요.",
  },
  nl: {
    "page.dashboard.ledgerTemplate": "Sjabloon",
    "page.dashboard.starterTemplate": "Startsjabloon",
    "page.dashboard.starterTemplateDescription":
      "Lege boeken met een standaard rekeningschema.",
    "page.dashboard.sampleTemplate": "Voorbeeldgrootboek",
    "page.dashboard.sampleTemplateDescription":
      "Een gedetailleerd grootboek met meerdere bestanden en realistische voorbeeldactiviteit.",
    "page.dashboard.ledgerCurrency": "Valuta",
    "page.dashboard.ledgerCurrencyDescription":
      "De valuta waarin uw boeken rapporteren. Rekeningen kunnen ook andere valuta bevatten.",
    "page.dashboard.ledgerCurrencyInvalid": "Kies een valuta uit de lijst.",
  },
  pt: {
    "page.dashboard.ledgerTemplate": "Modelo",
    "page.dashboard.starterTemplate": "Modelo inicial",
    "page.dashboard.starterTemplateDescription":
      "Livros vazios com um plano de contas padrão.",
    "page.dashboard.sampleTemplate": "Livro-razão de exemplo",
    "page.dashboard.sampleTemplateDescription":
      "Um livro-razão detalhado com vários arquivos e atividade de exemplo realista.",
    "page.dashboard.ledgerCurrency": "Moeda",
    "page.dashboard.ledgerCurrencyDescription":
      "A moeda em que seus livros são apresentados. As contas podem conter outras moedas.",
    "page.dashboard.ledgerCurrencyInvalid": "Escolha uma moeda da lista.",
  },
  ru: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Начальный шаблон",
    "page.dashboard.starterTemplateDescription":
      "Пустые книги со стандартным планом счетов.",
    "page.dashboard.sampleTemplate": "Пример книги",
    "page.dashboard.sampleTemplateDescription":
      "Подробная книга из нескольких файлов с реалистичными примерами операций.",
    "page.dashboard.ledgerCurrency": "Валюта",
    "page.dashboard.ledgerCurrencyDescription":
      "Валюта, в которой ведётся отчётность книги. Счета могут содержать и другие валюты.",
    "page.dashboard.ledgerCurrencyInvalid": "Выберите валюту из списка.",
  },
  sk: {
    "page.dashboard.ledgerTemplate": "Šablóna",
    "page.dashboard.starterTemplate": "Úvodná šablóna",
    "page.dashboard.starterTemplateDescription":
      "Prázdne knihy so štandardnou účtovnou osnovou.",
    "page.dashboard.sampleTemplate": "Vzorová účtovná kniha",
    "page.dashboard.sampleTemplateDescription":
      "Podrobná viac-súborová účtovná kniha s realistickou vzorovou aktivitou.",
    "page.dashboard.ledgerCurrency": "Mena",
    "page.dashboard.ledgerCurrencyDescription":
      "Mena, v ktorej kniha vykazuje. Účty môžu obsahovať aj iné meny.",
    "page.dashboard.ledgerCurrencyInvalid": "Vyberte menu zo zoznamu.",
  },
  uk: {
    "page.dashboard.ledgerTemplate": "Шаблон",
    "page.dashboard.starterTemplate": "Початковий шаблон",
    "page.dashboard.starterTemplateDescription":
      "Порожні книги зі стандартним планом рахунків.",
    "page.dashboard.sampleTemplate": "Приклад книги",
    "page.dashboard.sampleTemplateDescription":
      "Докладна книга з кількох файлів із реалістичними прикладами операцій.",
    "page.dashboard.ledgerCurrency": "Валюта",
    "page.dashboard.ledgerCurrencyDescription":
      "Валюта, у якій звітує книга. Рахунки можуть містити й інші валюти.",
    "page.dashboard.ledgerCurrencyInvalid": "Виберіть валюту зі списку.",
  },
  zh: {
    "page.dashboard.ledgerTemplate": "模板",
    "page.dashboard.starterTemplate": "入门模板",
    "page.dashboard.starterTemplateDescription": "带有标准科目表的空白账簿。",
    "page.dashboard.sampleTemplate": "示例账本",
    "page.dashboard.sampleTemplateDescription":
      "包含逼真示例活动的详细多文件账本。",
    "page.dashboard.ledgerCurrency": "货币",
    "page.dashboard.ledgerCurrencyDescription":
      "账本报表使用的货币。账户仍可持有其他货币。",
    "page.dashboard.ledgerCurrencyInvalid": "请从列表中选择货币。",
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
