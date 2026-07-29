interface TranslationEntry {
  message: string;
  description: string;
}

const descriptions = {
  "page.overview.emptyLedgerTitle": "Title for writable empty-ledger setup",
  "page.overview.emptyLedgerDescription":
    "Description for writable empty-ledger setup",
  "page.overview.emptyLedgerReadOnlyTitle":
    "Title for a read-only empty ledger",
  "page.overview.emptyLedgerReadOnlyDescription":
    "Description for a read-only empty ledger",
  "page.overview.emptyLedgerOpenAccountStep":
    "First empty-ledger setup step title",
  "page.overview.emptyLedgerOpenAccountDescription":
    "First empty-ledger setup step description",
  "page.overview.emptyLedgerOpenAccountAction":
    "Action to open the account form",
  "page.overview.emptyLedgerAddEntryStep":
    "Second empty-ledger setup step title",
  "page.overview.emptyLedgerAddEntryDescription":
    "Second empty-ledger setup step description",
  "page.overview.emptyLedgerAddEntryAction":
    "Action to open the first-entry form",
  "page.overview.emptyLedgerEditFileAction":
    "Action to edit the configured ledger file",
} as const;

type EmptyLedgerTranslationKey = keyof typeof descriptions;
type OverviewLanguage =
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

const messages: Record<
  OverviewLanguage,
  Record<EmptyLedgerTranslationKey, string>
> = {
  en: {
    "page.overview.emptyLedgerTitle": "Set up your ledger",
    "page.overview.emptyLedgerDescription":
      "Start with an account, then add your first entry.",
    "page.overview.emptyLedgerReadOnlyTitle": "Empty ledger",
    "page.overview.emptyLedgerReadOnlyDescription":
      "This ledger has no activity yet. You can view its accounts, journal, or source file.",
    "page.overview.emptyLedgerOpenAccountStep": "Open an account",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Create the account you will use for your first transaction.",
    "page.overview.emptyLedgerOpenAccountAction": "Open an account",
    "page.overview.emptyLedgerAddEntryStep": "Add your first entry",
    "page.overview.emptyLedgerAddEntryDescription":
      "Record a transaction in the journal, or edit the Beancount file directly.",
    "page.overview.emptyLedgerAddEntryAction": "Add first entry",
    "page.overview.emptyLedgerEditFileAction": "Edit ledger file",
  },
  bg: {
    "page.overview.emptyLedgerTitle": "Настройте счетоводната си книга",
    "page.overview.emptyLedgerDescription":
      "Започнете със сметка, след което добавете първия си запис.",
    "page.overview.emptyLedgerReadOnlyTitle": "Празна счетоводна книга",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Тази книга все още няма дейност. Можете да разгледате сметките, журнала или изходния файл.",
    "page.overview.emptyLedgerOpenAccountStep": "Отворете сметка",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Създайте сметката, която ще използвате за първата си транзакция.",
    "page.overview.emptyLedgerOpenAccountAction": "Отваряне на сметка",
    "page.overview.emptyLedgerAddEntryStep": "Добавете първия си запис",
    "page.overview.emptyLedgerAddEntryDescription":
      "Запишете транзакция в журнала или редактирайте директно Beancount файла.",
    "page.overview.emptyLedgerAddEntryAction": "Добавяне на първи запис",
    "page.overview.emptyLedgerEditFileAction": "Редактиране на файла",
  },
  ca: {
    "page.overview.emptyLedgerTitle": "Configura el llibre major",
    "page.overview.emptyLedgerDescription":
      "Comença amb un compte i després afegeix el primer assentament.",
    "page.overview.emptyLedgerReadOnlyTitle": "Llibre major buit",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Aquest llibre major encara no té activitat. Pots consultar els comptes, el diari o el fitxer font.",
    "page.overview.emptyLedgerOpenAccountStep": "Obre un compte",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Crea el compte que faràs servir per a la primera transacció.",
    "page.overview.emptyLedgerOpenAccountAction": "Obre un compte",
    "page.overview.emptyLedgerAddEntryStep": "Afegeix el primer assentament",
    "page.overview.emptyLedgerAddEntryDescription":
      "Registra una transacció al diari o edita directament el fitxer Beancount.",
    "page.overview.emptyLedgerAddEntryAction": "Afegeix el primer assentament",
    "page.overview.emptyLedgerEditFileAction": "Edita el fitxer del llibre",
  },
  de: {
    "page.overview.emptyLedgerTitle": "Hauptbuch einrichten",
    "page.overview.emptyLedgerDescription":
      "Beginnen Sie mit einem Konto und fügen Sie dann den ersten Eintrag hinzu.",
    "page.overview.emptyLedgerReadOnlyTitle": "Leeres Hauptbuch",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Dieses Hauptbuch enthält noch keine Aktivität. Sie können Konten, Journal oder Quelldatei ansehen.",
    "page.overview.emptyLedgerOpenAccountStep": "Konto eröffnen",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Erstellen Sie das Konto für Ihre erste Transaktion.",
    "page.overview.emptyLedgerOpenAccountAction": "Konto eröffnen",
    "page.overview.emptyLedgerAddEntryStep": "Ersten Eintrag hinzufügen",
    "page.overview.emptyLedgerAddEntryDescription":
      "Erfassen Sie eine Transaktion im Journal oder bearbeiten Sie die Beancount-Datei direkt.",
    "page.overview.emptyLedgerAddEntryAction": "Ersten Eintrag hinzufügen",
    "page.overview.emptyLedgerEditFileAction": "Hauptbuchdatei bearbeiten",
  },
  es: {
    "page.overview.emptyLedgerTitle": "Configura tu libro mayor",
    "page.overview.emptyLedgerDescription":
      "Empieza con una cuenta y después añade tu primer asiento.",
    "page.overview.emptyLedgerReadOnlyTitle": "Libro mayor vacío",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Este libro mayor aún no tiene actividad. Puedes ver sus cuentas, diario o archivo fuente.",
    "page.overview.emptyLedgerOpenAccountStep": "Abre una cuenta",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Crea la cuenta que usarás para tu primera transacción.",
    "page.overview.emptyLedgerOpenAccountAction": "Abrir una cuenta",
    "page.overview.emptyLedgerAddEntryStep": "Añade tu primer asiento",
    "page.overview.emptyLedgerAddEntryDescription":
      "Registra una transacción en el diario o edita directamente el archivo Beancount.",
    "page.overview.emptyLedgerAddEntryAction": "Añadir primer asiento",
    "page.overview.emptyLedgerEditFileAction": "Editar archivo del libro",
  },
  fa: {
    "page.overview.emptyLedgerTitle": "دفتر کل خود را راه‌اندازی کنید",
    "page.overview.emptyLedgerDescription":
      "با یک حساب شروع کنید و سپس نخستین ثبت را اضافه کنید.",
    "page.overview.emptyLedgerReadOnlyTitle": "دفتر کل خالی",
    "page.overview.emptyLedgerReadOnlyDescription":
      "این دفتر کل هنوز فعالیتی ندارد. می‌توانید حساب‌ها، دفتر روزنامه یا فایل منبع را ببینید.",
    "page.overview.emptyLedgerOpenAccountStep": "یک حساب باز کنید",
    "page.overview.emptyLedgerOpenAccountDescription":
      "حسابی را بسازید که برای نخستین تراکنش استفاده می‌کنید.",
    "page.overview.emptyLedgerOpenAccountAction": "باز کردن حساب",
    "page.overview.emptyLedgerAddEntryStep": "نخستین ثبت را اضافه کنید",
    "page.overview.emptyLedgerAddEntryDescription":
      "یک تراکنش در دفتر روزنامه ثبت کنید یا فایل Beancount را مستقیماً ویرایش کنید.",
    "page.overview.emptyLedgerAddEntryAction": "افزودن نخستین ثبت",
    "page.overview.emptyLedgerEditFileAction": "ویرایش فایل دفتر کل",
  },
  fr: {
    "page.overview.emptyLedgerTitle": "Configurez votre grand livre",
    "page.overview.emptyLedgerDescription":
      "Commencez par un compte, puis ajoutez votre première écriture.",
    "page.overview.emptyLedgerReadOnlyTitle": "Grand livre vide",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Ce grand livre n’a encore aucune activité. Vous pouvez consulter ses comptes, son journal ou son fichier source.",
    "page.overview.emptyLedgerOpenAccountStep": "Ouvrez un compte",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Créez le compte que vous utiliserez pour votre première transaction.",
    "page.overview.emptyLedgerOpenAccountAction": "Ouvrir un compte",
    "page.overview.emptyLedgerAddEntryStep": "Ajoutez votre première écriture",
    "page.overview.emptyLedgerAddEntryDescription":
      "Enregistrez une transaction dans le journal ou modifiez directement le fichier Beancount.",
    "page.overview.emptyLedgerAddEntryAction": "Ajouter la première écriture",
    "page.overview.emptyLedgerEditFileAction":
      "Modifier le fichier du grand livre",
  },
  ja: {
    "page.overview.emptyLedgerTitle": "元帳を設定",
    "page.overview.emptyLedgerDescription":
      "勘定科目を作成し、最初の仕訳を追加しましょう。",
    "page.overview.emptyLedgerReadOnlyTitle": "空の元帳",
    "page.overview.emptyLedgerReadOnlyDescription":
      "この元帳にはまだ取引がありません。勘定科目、仕訳帳、またはソースファイルを表示できます。",
    "page.overview.emptyLedgerOpenAccountStep": "勘定科目を作成",
    "page.overview.emptyLedgerOpenAccountDescription":
      "最初の取引で使用する勘定科目を作成します。",
    "page.overview.emptyLedgerOpenAccountAction": "勘定科目を作成",
    "page.overview.emptyLedgerAddEntryStep": "最初の仕訳を追加",
    "page.overview.emptyLedgerAddEntryDescription":
      "仕訳帳に取引を記録するか、Beancountファイルを直接編集します。",
    "page.overview.emptyLedgerAddEntryAction": "最初の仕訳を追加",
    "page.overview.emptyLedgerEditFileAction": "元帳ファイルを編集",
  },
  ko: {
    "page.overview.emptyLedgerTitle": "원장 설정하기",
    "page.overview.emptyLedgerDescription":
      "계정을 만든 다음 첫 번째 항목을 추가하세요.",
    "page.overview.emptyLedgerReadOnlyTitle": "빈 원장",
    "page.overview.emptyLedgerReadOnlyDescription":
      "이 원장에는 아직 활동이 없습니다. 계정, 분개장 또는 원본 파일을 볼 수 있습니다.",
    "page.overview.emptyLedgerOpenAccountStep": "계정 개설하기",
    "page.overview.emptyLedgerOpenAccountDescription":
      "첫 거래에 사용할 계정을 만드세요.",
    "page.overview.emptyLedgerOpenAccountAction": "계정 개설",
    "page.overview.emptyLedgerAddEntryStep": "첫 항목 추가하기",
    "page.overview.emptyLedgerAddEntryDescription":
      "분개장에 거래를 기록하거나 Beancount 파일을 직접 편집하세요.",
    "page.overview.emptyLedgerAddEntryAction": "첫 항목 추가",
    "page.overview.emptyLedgerEditFileAction": "원장 파일 편집",
  },
  nl: {
    "page.overview.emptyLedgerTitle": "Stel je grootboek in",
    "page.overview.emptyLedgerDescription":
      "Begin met een rekening en voeg daarna je eerste boeking toe.",
    "page.overview.emptyLedgerReadOnlyTitle": "Leeg grootboek",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Dit grootboek bevat nog geen activiteit. Je kunt de rekeningen, het journaal of het bronbestand bekijken.",
    "page.overview.emptyLedgerOpenAccountStep": "Open een rekening",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Maak de rekening die je voor je eerste transactie gebruikt.",
    "page.overview.emptyLedgerOpenAccountAction": "Rekening openen",
    "page.overview.emptyLedgerAddEntryStep": "Voeg je eerste boeking toe",
    "page.overview.emptyLedgerAddEntryDescription":
      "Boek een transactie in het journaal of bewerk het Beancount-bestand rechtstreeks.",
    "page.overview.emptyLedgerAddEntryAction": "Eerste boeking toevoegen",
    "page.overview.emptyLedgerEditFileAction": "Grootboekbestand bewerken",
  },
  pt: {
    "page.overview.emptyLedgerTitle": "Configure seu livro-razão",
    "page.overview.emptyLedgerDescription":
      "Comece com uma conta e depois adicione seu primeiro lançamento.",
    "page.overview.emptyLedgerReadOnlyTitle": "Livro-razão vazio",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Este livro-razão ainda não tem atividade. Você pode ver as contas, o diário ou o arquivo de origem.",
    "page.overview.emptyLedgerOpenAccountStep": "Abra uma conta",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Crie a conta que será usada na sua primeira transação.",
    "page.overview.emptyLedgerOpenAccountAction": "Abrir uma conta",
    "page.overview.emptyLedgerAddEntryStep": "Adicione seu primeiro lançamento",
    "page.overview.emptyLedgerAddEntryDescription":
      "Registre uma transação no diário ou edite diretamente o arquivo Beancount.",
    "page.overview.emptyLedgerAddEntryAction": "Adicionar primeiro lançamento",
    "page.overview.emptyLedgerEditFileAction": "Editar arquivo do livro-razão",
  },
  ru: {
    "page.overview.emptyLedgerTitle": "Настройте бухгалтерскую книгу",
    "page.overview.emptyLedgerDescription":
      "Начните со счёта, а затем добавьте первую запись.",
    "page.overview.emptyLedgerReadOnlyTitle": "Пустая бухгалтерская книга",
    "page.overview.emptyLedgerReadOnlyDescription":
      "В этой книге пока нет операций. Можно просмотреть счета, журнал или исходный файл.",
    "page.overview.emptyLedgerOpenAccountStep": "Откройте счёт",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Создайте счёт для первой транзакции.",
    "page.overview.emptyLedgerOpenAccountAction": "Открыть счёт",
    "page.overview.emptyLedgerAddEntryStep": "Добавьте первую запись",
    "page.overview.emptyLedgerAddEntryDescription":
      "Запишите транзакцию в журнале или отредактируйте файл Beancount напрямую.",
    "page.overview.emptyLedgerAddEntryAction": "Добавить первую запись",
    "page.overview.emptyLedgerEditFileAction": "Редактировать файл книги",
  },
  sk: {
    "page.overview.emptyLedgerTitle": "Nastavte účtovnú knihu",
    "page.overview.emptyLedgerDescription":
      "Začnite účtom a potom pridajte prvý záznam.",
    "page.overview.emptyLedgerReadOnlyTitle": "Prázdna účtovná kniha",
    "page.overview.emptyLedgerReadOnlyDescription":
      "Táto účtovná kniha zatiaľ nemá žiadnu aktivitu. Môžete si pozrieť účty, denník alebo zdrojový súbor.",
    "page.overview.emptyLedgerOpenAccountStep": "Otvorte účet",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Vytvorte účet, ktorý použijete pri prvej transakcii.",
    "page.overview.emptyLedgerOpenAccountAction": "Otvoriť účet",
    "page.overview.emptyLedgerAddEntryStep": "Pridajte prvý záznam",
    "page.overview.emptyLedgerAddEntryDescription":
      "Zaúčtujte transakciu v denníku alebo upravte súbor Beancount priamo.",
    "page.overview.emptyLedgerAddEntryAction": "Pridať prvý záznam",
    "page.overview.emptyLedgerEditFileAction": "Upraviť súbor knihy",
  },
  uk: {
    "page.overview.emptyLedgerTitle": "Налаштуйте облікову книгу",
    "page.overview.emptyLedgerDescription":
      "Почніть із рахунку, а потім додайте перший запис.",
    "page.overview.emptyLedgerReadOnlyTitle": "Порожня облікова книга",
    "page.overview.emptyLedgerReadOnlyDescription":
      "У цій книзі ще немає операцій. Можна переглянути рахунки, журнал або вихідний файл.",
    "page.overview.emptyLedgerOpenAccountStep": "Відкрийте рахунок",
    "page.overview.emptyLedgerOpenAccountDescription":
      "Створіть рахунок для першої транзакції.",
    "page.overview.emptyLedgerOpenAccountAction": "Відкрити рахунок",
    "page.overview.emptyLedgerAddEntryStep": "Додайте перший запис",
    "page.overview.emptyLedgerAddEntryDescription":
      "Запишіть транзакцію в журналі або відредагуйте файл Beancount безпосередньо.",
    "page.overview.emptyLedgerAddEntryAction": "Додати перший запис",
    "page.overview.emptyLedgerEditFileAction": "Редагувати файл книги",
  },
  zh: {
    "page.overview.emptyLedgerTitle": "设置账本",
    "page.overview.emptyLedgerDescription": "先创建账户，然后添加第一笔分录。",
    "page.overview.emptyLedgerReadOnlyTitle": "空账本",
    "page.overview.emptyLedgerReadOnlyDescription":
      "此账本尚无活动。你可以查看账户、日记账或源文件。",
    "page.overview.emptyLedgerOpenAccountStep": "创建账户",
    "page.overview.emptyLedgerOpenAccountDescription":
      "创建第一笔交易将使用的账户。",
    "page.overview.emptyLedgerOpenAccountAction": "创建账户",
    "page.overview.emptyLedgerAddEntryStep": "添加第一笔分录",
    "page.overview.emptyLedgerAddEntryDescription":
      "在日记账中记录交易，或直接编辑 Beancount 文件。",
    "page.overview.emptyLedgerAddEntryAction": "添加第一笔分录",
    "page.overview.emptyLedgerEditFileAction": "编辑账本文件",
  },
};

export const emptyLedgerOverviewTranslations = Object.fromEntries(
  Object.entries(messages).map(([language, languageMessages]) => [
    language,
    Object.fromEntries(
      Object.entries(languageMessages).map(([key, message]) => [
        key,
        {
          message,
          description: descriptions[key as EmptyLedgerTranslationKey],
        },
      ]),
    ),
  ]),
) as Record<
  OverviewLanguage,
  Record<EmptyLedgerTranslationKey, TranslationEntry>
>;
