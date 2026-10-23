import { en } from "./en";
import type { Translations } from "../common/translation-types";

export const de: Translations = {
  ...en,
  guestTryExample: "Beispiel ausprobieren",
  guestChooseExample: "Beispiel auswählen",
  guestReadOnly: "Schreibgeschütztes Beispiel",
  guestSignInHint: "Öffnet die Anmeldung",
  guestReadOnlyEditor:
    "Beispiel nur zum Lesen. Melden Sie sich an, um Ihr eigenes Hauptbuch zu bearbeiten.",
  guestExit: "Beispiele verlassen",
  guestIntroduction:
    "Erkunde echte Berichte ohne Konto. Diese Bücher sind schreibgeschützt.",
  guestExample0: "Alltagsfinanzen",
  guestExample1: "Unternehmensfinanzen",
  guestExample2: "Kryptoportfolio",
  guestExampleDescription0: "Einnahmen, Ausgaben, Ersparnisse und Anlagen.",
  guestExampleDescription1: "Die öffentlichen Finanzberichte von NVIDIA.",
  guestExampleDescription2: "Digitale Vermögenswerte, Preise und Marktwerte.",
  guestConnectionError:
    "Dieses Beispiel konnte nicht geladen werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.",
  guestUnavailable:
    "Dieses Beispiel ist nicht mehr öffentlich oder verfügbar. Wählen Sie ein anderes Beispiel.",
  guestNoExamples:
    "Auf diesem Server sind keine öffentlichen Beispiele verfügbar. Versuchen Sie es erneut oder wählen Sie auf dem Willkommensbildschirm einen anderen Server.",
  discoveryTitle: "Bücher durchsuchen",
  discoveryTab_yours: "Ihre Bücher",
  discoveryTab_starred: "Favoriten",
  discoveryTab_explore: "Entdecken",
  discoverySearch: "Bücher suchen",
  discoveryClear: "Suche löschen",
  clearSearch: "Suche löschen",
  discoveryOpen: "{{name}} öffnen",
  discoveryStar: "{{name}} als Favorit speichern",
  discoveryUnstar: "{{name}} aus Favoriten entfernen",
  discoveryPrivate: "Privat",
  discoveryPublic: "Öffentlich",
  discoveryCurrent: "Aktuell",
  discoveryLoading: "Bücher werden geladen…",
  discoveryLoadMore: "Mehr laden",
  discoveryRetry: "Erneut versuchen",
  discoveryNoMatches: "Keine Bücher entsprechen Ihrer Suche.",
  discoveryEmpty_yours:
    "Ihre Bücher erscheinen hier. Entdecken Sie öffentliche Bücher für den Einstieg.",
  discoveryEmpty_starred:
    "Speichern Sie ein Buch als Favorit, um es hier wiederzufinden.",
  discoveryEmpty_explore: "Keine öffentlichen Bücher gefunden.",
  discoveryLoadError:
    "Bücher konnten nicht geladen werden. Versuchen Sie es erneut.",
  discoveryActionError:
    "Die Aktion konnte nicht abgeschlossen werden. Prüfen Sie die Verbindung und den Zugriff auf das Buch und versuchen Sie es erneut.",
  ledgerReadOnly:
    "Dieses Buch ist schreibgeschützt. Wählen Sie ein Buch, das Sie bearbeiten können.",
  ledgerGoneTitle: "Dieses Buch ist nicht mehr verfügbar",
  ledgerGoneMessage:
    "Es wurde gelöscht, umbenannt oder nicht mehr freigegeben. Wählen Sie ein anderes Buch, um fortzufahren.",
  ledgerEditorNotUtf8:
    "Diese Datei ist kein UTF-8-Text. Eine Bearbeitung hier würde einige Zeichen verändern, daher wird sie schreibgeschützt geöffnet. Bearbeiten Sie sie am Computer.",
  ledgerEditorTooLarge:
    "Diese Datei ist zu groß, um sie auf dem Telefon zu öffnen, daher ist sie schreibgeschützt. Bearbeiten Sie sie auf einem Computer.",
  ledgerEditorTooLargeToEdit:
    "Diese Datei ist größer als 1 MiB und lässt sich vom Telefon aus nicht speichern, daher ist sie schreibgeschützt. Bearbeiten Sie sie im Web oder mit der CLI.",

  // bottom tab bar
  home: "Startseite",
  ledger: "Hauptbuch",
  files: "Dateien",
  journal: "Journal",
  settings: "Einstellungen",
  merchants: "Händler",
  openInBrowser: "Im Browser öffnen",
  shareLink: "Link teilen",
  copyLink: "Link kopieren",
  drawerCurrentLedger: "Aktuelles Buch",
  drawerNew: "Neu",
  drawerLedgerActions: "Aktionen für {{name}}",
  drawerPrivateLinkHint:
    "Empfänger benötigen Zugriff, um diesen Link zu öffnen.",
  drawerPublicLinkHint: "Jeder mit dem Link kann dieses Buch ansehen.",
  merchantsSearchPlaceholder: {
    one: "{{count}} Händler suchen…",
    other: "{{count}} Händler suchen…",
  },
  merchantsTransactionCount: {
    one: "{{count}} Transaktion",
    other: "{{count}} Transaktionen",
  },
  merchantsEmptyTitle: "Noch keine Händler",
  merchantsEmptyMessage:
    "Zahlungsempfänger aus Ihren Transaktionen erscheinen hier als durchsuchbares Verzeichnis.",
  merchantsNoSearchResults: "Keine Händler entsprechen Ihrer Suche.",
  merchantsLoadError: "Händler konnten nicht geladen werden",
  merchantsSortByCount: "Nach Transaktionsanzahl sortieren",
  merchantsSortAlphabetical: "Alphabetisch sortieren",
  merchantsRecurringSection: "Wiederkehrend",
  merchantsAllSection: "Alle Händler",
  merchantsRecurringBadge: "Wiederkehrend",
  merchantsCadenceWeekly: "Wöchentlich",
  merchantsCadenceBiweekly: "Alle 2 Wochen",
  merchantsCadenceSemimonthly: "Zweimal im Monat",
  merchantsCadenceMonthly: "Monatlich",
  merchantsCadenceBimonthly: "Alle 2 Monate",
  merchantsCadenceQuarterly: "Vierteljährlich",
  merchantsCadenceSemiannual: "Alle 6 Monate",
  merchantsCadenceYearly: "Jährlich",
  merchantsCadenceIrregular: "Unregelmäßig",
  merchantsCadenceUnknown: "Zu wenig Verlauf",
  merchantsCadenceInactive: "Keine aktuellen Zahlungen",
  merchantsNextExpected: "Nächste {{date}}",
  merchantsOverdue: "Überfällig",
  merchantsLastPaid: "Zuletzt bezahlt {{date}}",
  merchantsScheduled: "Geplant für {{date}}",
  merchantsRecurringToggle: "Wiederkehrend",
  merchantsRecurringToggleHelper:
    "Diesen Händler unter Wiederkehrend anheften. Manuelle Wahl schlägt die Erkennung und bleibt auf diesem Gerät.",
  merchantDetailDateRange: "{{first}} – {{last}}",
  merchantDetailLoadError: "Händler konnte nicht geladen werden",
  merchantDetailRetry: "Erneut versuchen",
  merchantDetailEmptyTitle: "Keine Transaktionen",
  merchantDetailEmptyMessage:
    "Keine Transaktionen stimmen genau mit diesem Händler überein.",
  merchantDetailLoadingMore: "Mehr laden…",
  // mine
  reviewApp: "Gefällt es Ihnen? Hinterlassen Sie eine Bewertung :)",
  helpCenter: "Hilfezentrum",
  currentLanguage: "Sprache",
  currentVersion: "Version",
  theme: "Design",
  themeLight: "Hell",
  themeDark: "Dunkel",
  themeSystem: "System",
  // layout direction — only a switch that crosses it costs a restart
  restartForLayoutTitle: "Zum Ändern des Layouts neu starten",
  restartForLayoutMessage:
    "{{language}} wird in die andere Richtung gelesen, daher muss Beancount neu starten, um sich korrekt anzuordnen. Wenn Sie das überspringen, wechselt die Sprache sofort — das Layout folgt beim nächsten Öffnen der App.",
  restartNow: "Jetzt neu starten",
  // logout alert
  logoutAlertMsg: "Sind Sie sicher, dass Sie sich abmelden möchten?",
  logoutAlertCancel: "Abbrechen",
  logoutAlertConfirm: "Abmelden",
  logout: "Abmelden",
  // Offline / stale cache
  staleDataNotice: "Zwischengespeicherte Zahlen — möglicherweise veraltet",
  // delete account alert
  deleteAccountAlertMsg:
    "Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden und löscht alle Ihre Daten dauerhaft.",
  deleteAccountAlertCancel: "Abbrechen",
  deleteAccountAlertConfirm: "Konto löschen",
  deleteAccount: "Konto löschen",
  deleteAccountDescription: "Konto und Daten dauerhaft entfernen",
  ledgers: "Hauptbücher",
  deleteAccountConfirmTitle: "Kontolöschung bestätigen",
  deleteAccountConfirmMessage:
    'Bitte geben Sie "sudo delete my account" ein, um zu bestätigen:',
  deleteAccountConfirmPhrase: "sudo delete my account",
  deleteAccountConfirmMismatch:
    "Geben Sie den Satz genau so ein, wie er angezeigt wird.",
  deleteAccountConfirmPlaceholder: "Geben Sie die Phrase hier ein",
  deleteAccountSuccess: "Konto gelöscht",
  deleteAccountFailed:
    "Das Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
  deleteAccountInProgress: "Konto wird gelöscht…",
  // settings sections
  appSettings: "App-Einstellungen",
  accountSettings: "Konto",
  supportSettings: "Support",
  signIn: "Anmelden",
  sessionEndedNotice:
    "Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an, um fortzufahren.",
  signUp: "Registrieren",
  serverSettings: "Servereinstellungen",
  serverSettingsDescription:
    "Verbinden Sie sich mit einem kompatiblen Beancount.io-Server. Verwenden Sie nur einen Server, dem Sie vertrauen; er erhält Ihre Anmeldedaten.",
  serverUrl: "Server-URL",
  serverUrlHelper:
    "Geben Sie die Basis-URL ein, zum Beispiel https://ledger.example.com/. Außerhalb der lokalen Entwicklung ist HTTPS erforderlich.",
  serverUrlEmpty: "Geben Sie eine Server-URL ein.",
  serverUrlInvalid: "Geben Sie eine vollständige HTTP- oder HTTPS-URL ein.",
  serverUrlCredentials:
    "Server-URLs dürfen keinen Benutzernamen oder kein Passwort enthalten.",
  serverUrlQuery:
    "Server-URLs dürfen keine Abfrage oder kein Fragment enthalten.",
  serverUrlInsecure:
    "Verwenden Sie HTTPS. HTTP ist nur für localhost in Entwicklungs-Builds verfügbar.",
  testConnection: "Verbindung testen",
  serverConnectionSuccess:
    "Mit einem kompatiblen Beancount.io-Server verbunden.",
  serverConnectionTimeout: "Der Server hat nicht rechtzeitig geantwortet.",
  serverConnectionUnreachable: "Dieser Server ist nicht erreichbar.",
  serverConnectionIncompatible:
    "Dieser Server stellt die erforderliche Beancount.io-API nicht bereit.",
  serverConnectionOlder:
    "Dieser Server ist älter als die App. Sie können sich verbinden, aber einige Funktionen funktionieren eventuell nicht.",
  serverConnectionNotConfigured:
    "Dieser Server ist noch nicht für die Anmeldung eingerichtet.",
  serverConnectionMismatch:
    "Diese Adresse stimmt nicht mit der vom Server gemeldeten überein. Öffnen Sie die Servereinstellungen und testen Sie die Verbindung.",
  serverConnectionCanonical: "Dieser Server meldet sich als {{url}}.",
  serverUseCanonical: "Diese Adresse verwenden",
  serverConnectionAdvisory:
    "Sie können diese URL trotzdem speichern und sich anmelden, wenn der Server verfügbar ist.",
  restoreDefaultServer: "Beancount.io-Standard wiederherstellen",
  backToSignIn: "Zurück zur Anmeldung",
  signInFailed:
    "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
  signUpFailed:
    "Die Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
  addTransaction: "Transaktion hinzufügen",
  assets: "Vermögen",
  expenses: "Ausgaben",
  income: "Einnahmen",
  quickAdd: "Schnell hinzufügen",
  enterNewTransaction: "Neue Transaktion erfassen",
  multiPostingsTitle: "Neue Transaktion",
  addPosting: "Buchung hinzufügen",
  remainderLabel: "Restbetrag",
  autoLabel: "auto",
  postingAccount: "Konto wählen",
  multiPostingsInvalidBalance: "Die Buchungen müssen in Summe null ergeben",
  multiPostingsMissingAccount: "Jede Buchung braucht ein Konto",
  multiPostingsZeroAmount: "Jede Buchung braucht einen Betrag ungleich null",
  multiPostingsAmountFormat:
    "Verwenden Sie Ziffern und einen Dezimalpunkt, z. B. 1234.56",
  accountPicker: "Kontoauswahl",
  accountPickerSearchPlaceholder: "Konten suchen",
  accountPickerRecent: "Zuletzt verwendet",
  accountPickerAllTab: "Alle",
  accountPickerNoResults: "Keine passenden Konten",
  accountPickerCreate: "„%{name}“ erstellen",
  accountPickerClosedOn: "{{name}} wurde am {{date}} geschlossen",
  accountPickerOpensOn:
    "{{name}} wird am {{date}} eröffnet. Ändern Sie das Datum, um es zu verwenden.",
  accountPickerOpenLater:
    "Ihre Konten werden am {{date}} eröffnet. Ändern Sie das Datum, um sie zu verwenden.",
  accountPickerNoAccounts: "Dieses Hauptbuch hat noch keine Konten.",
  cancel: "Abbrechen",
  confirm: "Bestätigen",
  saving: "Speichern...",
  deleting: "Löschen...",
  saveSuccess: "Transaktion gespeichert!",
  saveFailed: "Speichern fehlgeschlagen",
  profilePartialSave:
    "Der Benutzername wurde gespeichert, Ihr Name jedoch nicht. Bitte versuchen Sie es erneut.",
  accounts: "Konten",
  // Column header for the Accounts tab's account column. The balance column
  // reuses `balance`; each root row states its own valuation basis.
  account: "Konto",
  atCost: "{{amount}} zu Anschaffungskosten",
  postingCost: "Kosten {{amount}}",
  postingPrice: "Preis {{amount}}",
  notInTotal: "Nicht in der Summe: {{amounts}}",
  spendingLastMonthNotInTotal: "Letzter Monat, nicht enthalten: {{amounts}}",
  atMarket: "{{amount}} zum Marktwert",
  atMarketValue: "Zum Marktwert",
  pricesNotUpdatedSince: {
    one: "{{count}} Preis seit {{date}} nicht aktualisiert",
    other: "{{count}} Preise seit {{date}} nicht aktualisiert",
  },
  atCostNoPriceCount: {
    one: "{{count}} zu Anschaffungskosten (ohne Preis)",
    other: "{{count}} zu Anschaffungskosten (ohne Preis)",
  },
  notInTotalCount: {
    one: "{{count}} nicht in der Summe",
    other: "{{count}} nicht in der Summe",
  },
  valuationDetailsTitle: "Bestände und Preise",
  valuationDetailsHint: "Zeigt das Datum des letzten Preises jedes Bestands",
  valuationNoPrice: "Kein Preis",
  valuationNotUpdated: "Nicht aktualisiert",
  valuationAtCostTag: "Zu Anschaffungskosten",
  valuationNotInTotalTag: "Nicht in der Summe",
  valuationPriceDate: "Preis vom {{date}}",
  valuationLivePrice: "Live-Preis",
  updatePricesOnWeb: "Preise im Web aktualisieren",
  costBasisLine: "Anschaffungskosten {{cost}} · Unrealisierte G/V {{gain}}",
  liabilities: "Verbindlichkeiten",
  equity: "Eigenkapital",
  noDataCharts: "Schnell hinzufügen, um Diagramme anzuzeigen",
  notEnoughChartData: "Noch nicht genug Daten für ein Diagramm",
  chartSummary:
    "Von {{start}}, {{startValue}}, bis {{end}}, {{endValue}}. Tiefstwert {{low}}, Höchstwert {{high}}.",
  chartPointValue: "{{period}}, {{value}}, {{change}} seit Beginn",
  chartAdjustHint: "Nach oben oder unten wischen, um durch die Monate zu gehen",
  chartAdjustHintAndroid:
    "Öffnen Sie das Aktionsmenü, um durch die Monate zu gehen",
  done: "Fertig",
  payee: "Zahlungsempfänger",
  narration: "Beschreibung",
  suggestions: "Vorschläge",
  from: "Von",
  to: "An",
  date: "Datum",
  save: "Speichern",
  pleaseInput: "Bitte eingeben...",
  inviteFriends: "Freunde einladen",
  inviteSummary:
    "Teilen Sie dieses professionelle Finanzmanagement-Tool und helfen Sie anderen, ihre finanzielle Zukunft aufzubauen.",
  referral: "Empfehlung",
  copy: "Kopieren",
  copied: "Kopiert",
  share: "Teilen",
  rewardSummary: "Freunde einladen",
  rewardDetail:
    "Teilen Sie dieses professionelle Finanzmanagement-Tool und helfen Sie anderen, ihre finanzielle Zukunft aufzubauen.",
  recommend:
    "Ich möchte dieses professionelle Finanzmanagement-Tool teilen, das mir geholfen hat, meine Finanzen effektiv zu organisieren.",
  shareError: "Teilen fehlgeschlagen",
  loading: "laden...",
  "01": "JAN",
  "02": "FEB",
  "03": "MÄR",
  "04": "APR",
  "05": "MAI",
  "06": "JUN",
  "07": "JUL",
  "08": "AUG",
  "09": "SEP",
  "10": "OKT",
  "11": "NOV",
  "12": "DEZ",
  // transactions screen
  transactionsWelcomeTitle: "Willkommen bei Ihren Transaktionen! 🧾",
  transactionsWelcomeMessage: "Sie haben noch keine Transaktionen erfasst.",
  transactionsWelcomeInstructions: "So starten Sie:",
  transactionsWelcomeInstruction2:
    "Laden Sie beancount-Dateien über die Weboberfläche hoch",
  transactionsWelcomeInstruction3:
    "Importieren Sie vorhandene Buchhaltungsdaten",
  transactionsWelcomeInstructionFinal:
    "Sobald Sie Transaktionen hinzufügen, erscheinen sie hier.",
  transactionsNoSearchResults:
    "Keine Transaktionen entsprechen Ihrer Suche oder Ihren Filtern.",
  transactionsLoadError: "Transaktionen konnten nicht geladen werden",
  // transactions filter modal
  filters: "Filter",
  filtersActive: "Aktiv: {{count}}",
  clearAccount: "Konto entfernen",
  filterStatus: "Status",
  filterDateRange: "Zeitraum",
  filterDateRangeInvalid:
    "Das Enddatum muss am oder nach dem Startdatum liegen.",
  filterAccount: "Konto",
  allAccounts: "Alle Konten",
  rangeCustom: "Benutzerdefiniert",
  startDate: "Von",
  endDate: "Bis",
  apply: "Anwenden",
  reset: "Zurücksetzen",
  // shared labels & the open-account flow
  transactions: "Transaktionen",
  search: "Suchen",
  unknown: "Unbekannt",
  datePlaceholder: "JJJJ-MM-TT",
  openAccount: "Konto eröffnen",
  accountType: "Kontotyp",
  currency: "Währung",
  openDate: "Eröffnungsdatum",
  chooseAccountType: "Kontotyp wählen",
  chooseCurrency: "Währung wählen",
  openAccountNamePlaceholder: "Bank:Checking",
  openAccountNoCurrency: "Keine Währung",
  openAccountOtherCurrency: "Andere …",
  openAccountOtherCurrencyTitle: "Andere Währung",
  openAccountOtherCurrencyMessage:
    "Geben Sie ein Währungs- oder Wertpapierkürzel ein, zum Beispiel EUR oder VTI.",
  openAccountCurrencyInvalid:
    "Verwenden Sie Großbuchstaben, Ziffern und ' . _ -, beginnend mit einem Buchstaben, etwa EUR oder VTI.",
  openAccountSaving: "Wird eröffnet...",
  openAccountFailed:
    "Konto konnte nicht eröffnet werden. Bitte erneut versuchen.",
  ledgerWouldBreak:
    "Das würde Ihrem Hauptbuch einen Fehler hinzufügen: {{detail}}",
  ledgerRefusalLine: "Zeile {{line}}",
  ledgerRefusalNearEntry: "in der Nähe dieses Eintrags",
  ledgerRefusalQuoteHint:
    'Ein Anführungszeichen im Text schreiben Sie als \\".',
  ledgerWriteOffline: "Sie sind offline. Es wurde nichts gespeichert.",
  ledgerWriteUnconfirmed:
    "Der Server hat das Speichern nicht bestätigt. Prüfen Sie nach, bevor Sie es erneut versuchen.",
  ledgerWriteRateLimited:
    "Zu viele Änderungen auf einmal. Warten Sie kurz und versuchen Sie es erneut.",
  ledgerInvalidAccount: "{{value}} ist kein gültiger Kontoname.",
  ledgerInvalidCurrency: "{{value}} ist keine gültige Währung.",
  ledgerInvalidTag:
    "#{{value}} kann nicht als Tag verwendet werden. Verwenden Sie nur die Buchstaben A–Z, Ziffern und - _ . /",
  ledgerInvalidLink:
    "^{{value}} kann nicht als Link verwendet werden. Verwenden Sie nur die Buchstaben A–Z, Ziffern und - _ . /",
  ledgerInvalidFlag: "{{value}} kann nicht als Flag verwendet werden.",
  ledgerEntryOneAtATime: "Bearbeiten Sie jeweils nur einen Eintrag.",
  ledgerEntryIndent: "Rücken Sie die Buchungszeilen unter der Datumszeile ein.",
  ledgerEntryNotAnEntry:
    "Optionen, Plugins und Includes sind keine Einträge. Ändern Sie sie im Dateieditor des Buchs.",
  openAccountInvalidRoot: "Wählen Sie einen gültigen Kontotyp.",
  openAccountNameRequired: "Geben Sie mindestens einen Namensbestandteil ein.",
  openAccountEmptyComponent: "Namensbestandteile dürfen nicht leer sein.",
  openAccountNamePreview: "Wird als {{account}} erstellt",
  openAccountAlreadyOpen:
    "{{account}} ist in diesem Hauptbuch bereits eröffnet.",
  openAccountOpensLater:
    "{{account}} ist bereits in diesem Hauptbuch und wird am {{date}} eröffnet.",
  openAccountClosed:
    "{{account}} wurde am {{date}} geschlossen und kann nicht wieder eröffnet werden.",
  openAccountUppercaseComponent:
    "Jeder Namensbestandteil muss mit einem Großbuchstaben oder einer Ziffer beginnen.",
  openAccountInvalidCharacters:
    "Verwenden Sie in Kontonamen nur Buchstaben, Ziffern und Bindestriche.",
  transaction: "Transaktion",
  transactionActions: "Transaktionsaktionen",
  loadingMore: "Lädt mehr...",
  noMoreEntries: "Keine weiteren Einträge",
  loadMoreFailed: "Weitere Einträge konnten nicht geladen werden.",
  a11yTapToExpand: "Zum Aufklappen doppeltippen",
  a11yTapToCollapse: "Zum Zuklappen doppeltippen",
  noEntries: "Keine Einträge",
  accountDetailUnavailable:
    "Dieses Konto ist im ausgewählten Hauptbuch nicht verfügbar.",
  transactionDetailUnavailable:
    "Diese Buchung ist im ausgewählten Hauptbuch nicht verfügbar.",
  transactionDetailRemoved:
    "Diese Buchung wurde geändert oder entfernt. Gehen Sie zurück, um die aktuelle Liste zu sehen.",
  transactionErrorOpenFile: "Im Dateieditor öffnen",
  pluginCopyNotice:
    "Ein Plugin hat diesen Eintrag aus einem anderen erzeugt, daher kann er hier nicht bearbeitet oder gelöscht werden.",
  pluginCopyOpenSource: "Quelleintrag öffnen",
  merchantDetailUnavailable:
    "Dieser Händler ist im ausgewählten Hauptbuch nicht verfügbar.",
  commitDetailUnavailable:
    "Diese Änderung ist im ausgewählten Hauptbuch nicht verfügbar.",
  commitDetailGone: "Dieser Commit ist nicht mehr verfügbar.",
  fileEditorUnavailable:
    "Diese Datei ist im ausgewählten Hauptbuch nicht verfügbar.",
  journalLoadError: "Fehler beim Laden des Journals",
  // entry context (transactions screen)
  journalError: "Fehler",
  journalNoData: "Keine Eintragskontextdaten verfügbar",
  dateSectionHeaderTotal: "{{date}}, gesamt {{total}}",
  journalEntryContext: "Eintragskontext",
  journalBalancesBefore: "Salden vor Eintrag",
  journalBalancesAfter: "Salden nach Eintrag",
  journalSource: "Quellcode",
  // directive types & entry filters
  open: "Eröffnen",
  close: "Schließen",
  balance: "Saldo",
  balanceOffBy: "Abweichung {{amount}}",
  note: "Notiz",
  document: "Beleg",
  pad: "Ausgleich",
  price: "Kurs",
  custom: "Eigene",
  cleared: "Bestätigt",
  pending: "Offen",
  entryUpcoming: "Bevorstehend",
  other: "Sonstige",
  budget: "Budget",
  metadata: "Metadaten",
  accountOwnPostings: "{{name}} (eigene)",
  postings: "Buchungen",
  details: "Details",
  tags: "Tags",
  links: "Links",
  // reports tab
  reports: "Berichte",
  netProfit: "Gewinn",
  cashFlow: "Cashflow",
  cashFlowRefunds: "Erstattungen",
  cashFlowClawbacks: "Rückforderungen",
  moneyFlow: "Geldbewegung",
  cashFlowEmpty: "Kein Cashflow in diesem Zeitraum",
  savings: "Ersparnisse",
  // feed
  latestUpdates: "Neueste Änderungen",
  // unmatched route fallback
  notFoundTitle: "Seite nicht gefunden",
  notFoundBody: "Dieser Link führt nirgendwohin in der App.",
  notFoundGoHome: "Zur Startseite",
  // home dashboard
  seeAll: "Alle ansehen",
  seeAllCard: "Alle ansehen: {{title}}",
  seeAllAccounts: "Alle Konten ansehen",
  netWorth: "Nettovermögen",
  noAccounts: "Keine Konten",
  reportsNoExpenses: "Keine Ausgaben in diesem Zeitraum",
  reportsNoIncome: "Keine Einnahmen in diesem Zeitraum",
  recentTransactions: "Letzte Transaktionen",
  recentTransactionsEmpty: "Noch keine Transaktionen",
  recentTransactionsUpcoming:
    "Bis heute noch nichts. Anstehende Buchungen stehen unter Transaktionen.",
  recentTransactionsEmptyRange: "Keine Transaktionen in diesem Zeitraum",
  spending: "Ausgaben",
  spendingSubtitle: "Dieser Monat vs. Vormonat",
  spendingChartSummary:
    "Ausgaben: letzter Monat {{lastMonth}}, dieser Monat {{thisMonth}}.",
  spendingEmpty: "Noch keine Ausgaben",
  thisMonth: "Dieser Monat",
  lastMonth: "Vormonat",
  range1M: "1M",
  range3M: "3M",
  range6M: "6M",
  rangeYTD: "YTD",
  range1Y: "1J",
  rangeLastYear: "VJ",
  rangeAll: "ALLE",
  rangeSpoken1M: "1 Monat",
  rangeSpoken3M: "3 Monate",
  rangeSpoken6M: "6 Monate",
  rangeSpokenYTD: "Jahr bis heute",
  rangeSpoken1Y: "1 Jahr",
  rangeSpokenLastYear: "Letztes Jahr",
  rangeSpokenAll: "Gesamter Zeitraum",
  // edit / delete transaction
  editTransaction: "Transaktion bearbeiten",
  deleteTransaction: "Löschen",
  deleteTransactionTitle: "Transaktion löschen",
  deleteTransactionMessage:
    "Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
  deleteSuccess: "Transaktion gelöscht",
  deleteFailed: "Transaktion konnte nicht gelöscht werden",
  deleteTransactionChanged:
    "Diese Transaktion wurde an anderer Stelle geändert. Sie wurde neu geladen; versuchen Sie, sie erneut zu löschen.",
  editSuccess: "Transaktion gespeichert",
  editFailed: "Transaktion konnte nicht gespeichert werden",
  editTransactionEmpty:
    "Ein leerer Eintrag kann nicht gespeichert werden. Um die Transaktion zu entfernen, verwenden Sie „Löschen“ in ihrer Detailansicht.",
  editTransactionLoadFailed: "Transaktion konnte nicht geladen werden",
  editTransactionSource:
    "Bearbeiten Sie unten den beancount-Quelltext. Eine veraltete Prüfsumme oder ungültiges beancount wird mit einem Fehler abgelehnt.",
  editConflict:
    "Die Transaktion wurde anderswo geändert. Bitte neu laden und erneut versuchen.",
  // receipt capture
  scanReceipt: "Beleg scannen",
  receiptTakePhoto: "Foto aufnehmen",
  receiptChooseLibrary: "Aus Mediathek wählen",
  receiptFlash: "Blitz",
  receiptFlashOff: "Aus",
  receiptFlashOn: "Ein",
  receiptRetake: "Neu",
  receiptTryAgain: "Erneut versuchen",
  receiptUpload: "Hochladen",
  receiptOpenSettings: "Einstellungen öffnen",
  receiptAllowCamera: "Kamera erlauben",
  receiptCancel: "Abbrechen",
  receiptUploading: "Foto wird hochgeladen…",
  receiptUploadingProgress: "Foto wird hochgeladen… {{percent}} %",
  receiptParsing: "Die KI liest Ihren Beleg…",
  receiptRevealTitle: "Das haben wir gelesen",
  receiptRevealSpoken: "Beleg gelesen: {{summary}}",
  // Deliberately a proposal: nothing is written to the ledger until the user
  // saves on the next screen.
  receiptRevealHint:
    "Noch nichts gespeichert — prüfen Sie die Details im nächsten Schritt.",
  total: "Summe",
  receiptQuotaExhausted: "KI-Kontingent aufgebraucht.",
  receiptParseFailed:
    "Beleg konnte nicht gelesen werden. Bitte erneut versuchen.",
  receiptUploadFailed: "Hochladen fehlgeschlagen. Bitte erneut versuchen.",
  receiptCameraPermission:
    "Für das Foto Ihres Belegs wird Kamerazugriff benötigt. Aktivieren Sie ihn in den Einstellungen.",
  receiptLibraryPermission:
    "Für die Auswahl eines Belegs wird Zugriff auf die Mediathek benötigt. Aktivieren Sie ihn in den Einstellungen.",
  // notifications
  notificationsBell: "Mitteilungen",
  notificationsTitle: "Mitteilungen",
  notificationsErrorsSection: "Hauptbuch-Fehler",
  notificationsChangesSection: "Letzte Änderungen",
  notificationsLedgerHealthy: "Hauptbuch in Ordnung — keine Fehler.",
  notificationsNoChanges: "Keine aktuellen Änderungen.",
  notificationsShowOlder: "Ältere Änderungen anzeigen",
  commitNoMessage: "(keine Nachricht)",
  // commit detail
  commitDetailAuthor: "Autor",
  commitDetailStats: "Statistik",
  commitDetailFiles: "Dateien",
  commitFileAdded: "Hinzugefügt",
  commitFileDeleted: "Gelöscht",
  commitFileRenamedFrom: "Umbenannt von {{name}}",
  commitDetailDiff: "Diff",
  commitDetailShowMore: {
    one: "{{count}} weitere Zeile anzeigen",
    other: "{{count}} weitere Zeilen anzeigen",
  },
  commitDetailNoDiff: "Kein Diff verfügbar.",
  commitDetailAdditions: {
    one: "+{{count}} Zeile",
    other: "+{{count}} Zeilen",
  },
  commitDetailDeletions: {
    one: "-{{count}} Zeile",
    other: "-{{count}} Zeilen",
  },
  // ledger file browser
  ledgerLoadError: "Laden fehlgeschlagen",
  ledgerEmpty: "Keine Dateien",
  ledgerEmptyHint:
    "Legen Sie hier eine Hauptbuchdatei an oder ziehen Sie zum Aktualisieren nach unten.",
  ledgerRefreshHint: "Ziehen Sie nach unten, um diesen Ordner erneut zu laden.",
  ledgerCreateFile: "Datei anlegen",
  ledgerCreateFileTitle: "Neue Hauptbuchdatei",
  ledgerCreateFileMessage:
    "Geben Sie einen eindeutigen .bean- oder .beancount-Dateinamen ein. Ohne Endung wird .bean ergänzt.",
  ledgerCreateFilePlaceholder: "investments.bean",
  ledgerCreateFileSuccess: "{{name}} angelegt",
  ledgerCreateFileSuccessIn: "{{name}} in {{ledger}} erstellt",
  ledgerCreateFileFailed: "Datei konnte nicht angelegt werden",
  ledgerFileNameExists: "Eine Datei namens {{name}} existiert bereits",
  ledgerFileNameExtension:
    "Verwenden Sie einen Namen mit .bean oder .beancount",
  ledgerFileNamePath:
    "Verwenden Sie einen Namen ohne \\, .. oder leere Ordnernamen",
  ledgerFileNamePortable:
    'Nicht erlaubt: < > : " | ? *, Teile, die auf Punkt oder Leerzeichen enden, und Namen wie con oder nul',
  ledgerDeleteFile: "{{name}} löschen",
  ledgerFilesFolderLabel: "{{name}}, Ordner",
  ledgerFilesFileLabel: "{{name}}, Datei",
  ledgerDeleteFileTitle: "Hauptbuchdatei löschen",
  ledgerDeleteFileMessage:
    '"{{name}}" löschen? Das kann nicht rückgängig gemacht werden.',
  ledgerDeleteFileConfirm: "Löschen",
  ledgerDeleteFileSuccess: "{{name}} gelöscht",
  ledgerDeleteFileFailed: "Datei konnte nicht gelöscht werden",
  ledgerDeleteFileChanged:
    "Diese Datei wurde anderswo geändert. Die Liste wurde aktualisiert; versuchen Sie es erneut.",
  ledgerMainFileProtected: "main.bean kann nicht gelöscht werden",
  // ledger file editor
  ledgerEditorSave: "Speichern",
  ledgerEditorSaving: "Speichern...",
  ledgerEditorSaveSuccess: "Datei gespeichert",
  ledgerEditorSaveFailed: "Speichern fehlgeschlagen",
  ledgerEditorSaveLeftErrorsTitle: "Gespeichert, mit neuem Fehler im Hauptbuch",
  ledgerEditorSaveLeftErrors:
    "Die Datei ist gespeichert, aber Ihr Hauptbuch hat jetzt einen Fehler, den es vorher nicht hatte: {{error}}",
  ledgerEditorViewErrors: "Fehler anzeigen",
  ledgerEditorLoadFailed: "Datei konnte nicht geladen werden",
  ledgerEditorFileUnavailable: "Diese Datei ist nicht mehr im Hauptbuch.",
  ledgerEditorBackToFiles: "Zurück zu Dateien",
  ledgerEditorUnsavedTitle: "Nicht gespeicherte Änderungen",
  ledgerEditorUnsavedMessage: "Änderungen verwerfen?",
  ledgerEditorDiscardChanges: "Verwerfen",
  ledgerEditorConflictTitle: "Datei geändert",
  ledgerEditorConflictMessage:
    "Diese Datei wurde extern geändert. Ihren Text darüber speichern oder ihn kopieren und die neue Version laden?",
  ledgerEditorOverwrite: "Überschreiben",
  ledgerEditorCopyReload: "Kopieren & neu laden",
  ledgerEditorOverwriteTitle: "Externe Änderungen überschreiben?",
  ledgerEditorOverwriteMessage:
    "Ihr Text ersetzt die anderswo gespeicherte Version. Deren Änderungen gehen verloren.",
  ledgerEditorFileGoneTitle: "Datei gelöscht",
  ledgerEditorFileGoneMessage:
    "Diese Datei wurde anderswo gelöscht oder verschoben und kann nicht gespeichert werden. Ihr Text ist noch da: Kopieren Sie ihn oder speichern Sie ihn als neue Datei unter demselben Pfad.",
  ledgerEditorRecreate: "Als neue Datei speichern",
  ledgerEditorSaveFailedHint:
    "Ihr Text ist noch da. Versuchen Sie es gleich noch einmal.",
  ledgerEditorAccessRemoved:
    "Sie können dieses Hauptbuch nicht mehr bearbeiten. Ihr Text ist noch da: Kopieren Sie ihn, um ihn zu behalten.",
  ledgerEditorCopyFailed:
    "Ihr Text konnte nicht kopiert werden, daher wurde die Datei nicht neu geladen.",
  ledgerEditorReload: "Neu laden",
  ledgerEditorKeepEditing: "Weiter bearbeiten",
  keyboardAccessoryInsert: "{{symbol}} einfügen",
  keyboardInsertDate: "Heutiges Datum einfügen",
  keyboardInsertCleared: "Flag „abgeglichen“ einfügen",
  keyboardInsertPending: "Flag „ausstehend“ einfügen",
  keyboardInsertQuotes: "Anführungszeichen einfügen",
  keyboardInsertColon: "Doppelpunkt einfügen",
  keyboardInsertTab: "Tabulator einfügen",
  keyboardInsertMinus: "Minus einfügen",
  keyboardInsertTag: "Tag einfügen",
  keyboardInsertLink: "Link einfügen",
  keyboardAccessoryDismiss: "Tastatur ausblenden",
  ledgerEditorErrorLine: "Zeile {{line}}",
  ledgerEditorJumpToLine: "Zu Zeile {{line}} springen",
  ledgerEditorErrorCount: {
    one: "{{count}} Fehler",
    other: "{{count}} Fehler",
  },
  // budget — dated spending/income targets per account, stored as
  // `custom "budget"` directives. Copy mirrors the dashboard's page.budget.*
  // namespace so the two clients speak the same language.
  budgetActual: "Ist",
  budgetVariance: "Abweichung",
  budgetAboveTarget: "Über dem Ziel",
  budgetBelowTarget: "Unter dem Ziel",
  budgetOnTarget: "Im Ziel",
  budgetHistoryCount: {
    one: "{{count}} Eintrag",
    other: "{{count}} Einträge",
  },
  budgetNoBudgetsFound: "Keine Budgets gefunden",
  budgetNoBudgetsFoundDescription:
    "Legen Sie für ein beliebiges Konto ein Ziel fest, um es zu verfolgen.",
  budgetEmptyStateCta: "Erstes Budget hinzufügen",
  budgetPanelEmpty: "Für ein Konto ein Ziel festlegen",
  budgetPanelEmptyGuest: "Melden Sie sich an, um Ausgabenziele festzulegen",
  budgetPanelRowValue:
    "{{actual}} von {{budget}}, {{percent}}% genutzt, {{status}}",
  budgetPanelRowValueNoBudget: "{{actual}} von {{budget}}, {{status}}",
  budgetStartsOn: "Beginnt am {{date}}",
  budgetLoadFailed: "Budgets konnten nicht geladen werden",
  budgetIntervalDaily: "Täglich",
  budgetIntervalWeekly: "Wöchentlich",
  budgetIntervalMonthly: "Monatlich",
  budgetIntervalQuarterly: "Vierteljährlich",
  budgetIntervalYearly: "Jährlich",
  budgetIntervalAdjDaily: "tägliche",
  budgetIntervalAdjWeekly: "wöchentliche",
  budgetIntervalAdjMonthly: "monatliche",
  budgetIntervalAdjQuarterly: "vierteljährliche",
  budgetIntervalAdjYearly: "jährliche",
  // add / update budget
  budgetAdd: "Budget hinzufügen",
  budgetUpdate: "Budget aktualisieren",
  budgetAccountPlaceholder: "Expenses:Groceries",
  budgetAccountHelp:
    "Budgets gelten für ein Konto. Ein neuerer Eintrag für dasselbe Konto und dieselbe Währung gilt ab seinem Datum.",
  budgetInterval: "Intervall",
  budgetSelectInterval: "Intervall auswählen",
  budgetAmount: "Betrag",
  budgetAmountInvalid: "Geben Sie eine Zahl ein, z. B. 500 oder 49.99.",
  budgetSaveFailed: "Budget konnte nicht gespeichert werden",
  // delete
  budgetDelete: "Löschen",
  budgetUpdateNamed: "Budget für {{account}} aktualisieren, {{currency}}",
  budgetDeleteNamed: "Budgeteintrag vom {{date}} löschen, {{amount}}",
  budgetDeleteTitle: "Budget löschen",
  budgetDeleteMessage:
    "Das {{interval}} Budget von {{amount}} für {{account}} mit Wirkung zum {{date}} löschen? Dies entfernt einen einzelnen Eintrag und kann nicht rückgängig gemacht werden.",
  budgetDeleteFailed: "Budget konnte nicht gelöscht werden",
  budgetDeleteChanged:
    "Dieser Budgeteintrag wurde anderswo geändert. Der Verlauf wurde aktualisiert; versuchen Sie es erneut.",

  // Ask Beancount.io — the agent chat
  agentTitle: "Beancount.io fragen",
  agentWelcome:
    "Fragen Sie mich alles über Ihr Hauptbuch – Salden, Ausgaben oder wie eine Zahl zustande kam.",
  agentPlaceholder: "Fragen zu Ihrem Hauptbuch",
  agentReadOnlyTitle: "Agent mit Lesezugriff",
  agentReadOnlyBody:
    "Sie können Fragen stellen und Dateien analysieren. Änderungen benötigen Schreibzugriff, aber ich kann sie für Sie entwerfen.",
  agentThinking: "Denkt nach …",
  agentWorking: "Ihr Hauptbuch wird durchsucht …",
  agentSend: "Senden",
  agentStop: "Stoppen",
  agentNewChat: "Neuer Chat",
  agentRetry: "Erneut versuchen",
  agentErrorBody: "Diese Frage ist nicht durchgekommen.",
  agentNoAnswerBody:
    "Ich habe Ihr Hauptbuch durchsucht, aber die Schritte waren aufgebraucht, bevor ich antworten konnte. Eine gezieltere Frage führt meist zum Ziel.",
  agentQuotaTitle: "Monatliches KI-Limit erreicht",
  agentQuotaBody:
    "Sie haben das KI-Kontingent dieses Monats aufgebraucht. Es wird nächsten Monat zurückgesetzt.",
  agentApprovalTitle: "Im Web bestätigen",
  agentApprovalBody:
    "Diese Änderung muss geprüft werden, bevor sie in Ihr Hauptbuch gelangt, und die App kann den vollständigen Diff noch nicht anzeigen. Öffnen Sie dieses Hauptbuch auf beancount.io, um sie zu bestätigen.",
  agentAskCard: "Fragen zu Ihrem Hauptbuch",
  agentPresetNetWorth: "Wie hoch ist mein Nettovermögen?",
  agentPresetTopSpending: "Wofür habe ich diesen Monat am meisten ausgegeben?",
  agentPresetThisMonth: "Wie ist dieser Monat im Vergleich zum letzten?",

  createLedgerTitle: "Neues Hauptbuch",
  createLedgerSubmit: "Erstellen",
  createLedgerName: "Bezeichnung",
  createLedgerNamePlaceholder: "my-book",
  createLedgerNameRequired: "Geben Sie einen Hauptbuchnamen ein.",
  createLedgerNameMaxLength: "Der Name darf höchstens 100 Zeichen haben.",
  createLedgerNameInvalid:
    "Der Name muss mindestens einen Buchstaben oder eine Ziffer enthalten.",
  createLedgerNameConflict: "Ein Hauptbuch mit diesem Namen existiert bereits.",
  createLedgerNameReserved:
    "Dieser Name gehörte zu einem umbenannten Hauptbuch und leitet noch dorthin weiter. Wählen Sie einen anderen Namen.",
  createLedgerSetupUnsupported:
    "Dieser Server unterstützt die geführte Einrichtung nicht. Wählen Sie zurück Einstieg oder Beispiel, um ein Hauptbuch mit den Standardwerten des Servers anzulegen.",
  createLedgerCreated: "{{name}} angelegt",
  createLedgerSlugPreview: "Wird als {{slug}} erstellt",
  createLedgerDescription: "Beschreibung",
  createLedgerDescriptionPlaceholder: "Optional (leer lassen)",
  createLedgerPrivate: "Privat",
  createLedgerPublic: "Öffentlich",
  createLedgerTemplate: "Vorlage",
  createLedgerTemplateStarter: "Einstieg",
  createLedgerTemplateStarterHint: "Leeres Hauptbuch mit Standard-Kontenplan.",
  createLedgerTemplateSample: "Beispiel",
  createLedgerTemplateSampleHint: "Beispielbuchungen zum Erkunden der App.",
  createLedgerTierLimit:
    "Das Limit für Hauptbücher wurde erreicht. Es kann kein weiteres Hauptbuch erstellt werden.",
  createLedgerGenericError:
    "Hauptbuch konnte nicht erstellt werden. Bitte erneut versuchen.",
  createLedgerStillCreating:
    "Dieses Hauptbuch wird noch erstellt. Warten Sie einige Sekunden und tippen Sie erneut auf Erstellen.",
  createLedgerDrawerRow: "Neues Hauptbuch",
  createLedgerEmptyTitle: "Noch keine Hauptbücher",
  createLedgerEmptyBody:
    "Erstellen Sie ein Hauptbuch oder entdecken Sie öffentliche Beispiele.",
  createLedgerEmptyCreate: "Erstellen",
  createLedgerEmptyDiscover: "Entdecken",
  ledgerGuardTitle: "Kein Hauptbuch ausgewählt",
  ledgerGuardMessage:
    "Erstellen oder entdecken Sie ein Hauptbuch, um fortzufahren.",
  removePosting: "Buchung entfernen",
  toggleAmountSign: "Vorzeichen des Betrags umschalten",
  postingSignToggle: "Vorzeichen für {{account}}",
  signPlus: "Plus",
  signMinus: "Minus",
  incomeExpenseChartSummary: {
    one: "Einnahmen und Ausgaben über {{count}} Monat. Einnahmen {{income}}, Ausgaben {{expense}}, Netto {{net}}.",
    other:
      "Einnahmen und Ausgaben über {{count}} Monate. Einnahmen {{income}}, Ausgaben {{expense}}, Netto {{net}}.",
  },
  cashFlowChartSummary:
    "Cashflow von Einnahmen zu Ausgaben. Einnahmen {{income}}, Ausgaben {{expenses}}.",
  cashFlowChartSummaryWithSavings:
    "Cashflow von Einnahmen zu Ausgaben. Einnahmen {{income}}, Ausgaben {{expenses}}, Ersparnisse {{savings}}.",
  cashFlowChartSummaryWithShortfall:
    "Cashflow von Einnahmen zu Ausgaben. Einnahmen {{income}}, Ausgaben {{expenses}}, aus Ersparnissen {{shortfall}}.",
  sankeyIncomeNodeLabel: "{{name}} (Einnahmen)",
  sankeyExpensesNodeLabel: "{{name}} (Ausgaben)",
  ledgerNavigateUp: "Eine Ebene nach oben",
  ledgerNavigateUpTo: "Nach oben zu {{folder}}",
  openLedgerDrawer: "Menü öffnen",
  back: "Zurück",
  postingAmountLabel: "Betrag für {{account}}",
  postingNumber: "Buchungszeile {{number}}",
  postingAmountHint:
    "Betrag eingeben. Mit der Vorzeichentaste zwischen positiv und negativ wechseln.",
  expandAccount: "{{account}} ausklappen",
  collapseAccount: "{{account}} einklappen",
  breakdownRowShare: "{{amount}}, {{percent}} % des Gesamtbetrags",
  budgetChartSummary: {
    one: "Budget gegen Ist für {{span}}. Ist {{actual}} von geplanten {{budget}} über {{count}} Periode, {{missed}}.",
    other:
      "Budget gegen Ist für {{span}}. Ist {{actual}} von geplanten {{budget}} über {{count}} Perioden, {{missed}}.",
  },
  budgetSummaryOverTarget: "{{count}} über dem Ziel",
  budgetSummaryBelowTarget: "{{count}} unter dem Ziel",
  feedSourceLedger: "Hauptbuch",
  feedSourceBlog: "Blog",
  feedSourceRelease: "Veröffentlichung",
  reportsThroughLatestMonth:
    "Angezeigt bis {{month}}, dem letzten Monat mit Buchungen.",
  merchantTotalAtRates: "{{amount}} zu den erfassten Kursen",
  feedCommittedTo: "Commit in {{ledger}}",
  feedCreatedLedger: "Hauptbuch {{ledger}} erstellt",
  feedPushCommits: {
    one: "{{count}} Commit",
    other: "{{count}} Commits",
  },
  profile: "Profil",
  signedInAs: "Angemeldet als {{name}}, {{email}}",
  openSettings: "Öffnet die Einstellungen",
  profileFirstName: "Vorname",
  profileLastName: "Nachname",
  profileUsername: "Benutzername",
  profileUsernameHint:
    "Die Webadressen Ihrer Hauptbücher beginnen mit Ihrem Benutzernamen – wenn Sie ihn ändern, ändern sie sich mit.",
  profileUsernameRequired: "Geben Sie einen Benutzernamen ein",
  profileNameTooLong: "Höchstens 100 Zeichen.",
  profileUsernameRule:
    "Verwenden Sie 1–20 Zeichen: Kleinbuchstaben a–z, Ziffern 0–9 oder Unterstriche.",
  profileUsernameTaken: "Dieser Benutzername ist bereits vergeben",
  profileEmail: "E-Mail",
  profileEmailReadOnly: "Die E-Mail-Adresse kann hier nicht geändert werden",
  profileNotSet: "Nicht festgelegt",
  profilePhotoFromGravatar: "Foto von Gravatar",
  profileAddGravatar: "Foto bei Gravatar hinzufügen",
  profileUpdated: "Profil aktualisiert",
  multiplePostings: "Mehrere Buchungen",
  createLedgerNext: "Weiter",
  createLedgerBack: "Zurück",
  createLedgerStep: "Schritt {{step}} von {{total}}",
  createLedgerStartPreset: "Vorlage",
  createLedgerStartPresetHint:
    "Wählen Sie einen fertigen Kontenplan für das, was Sie erfassen: Haushalt, Unternehmen, Investitionen.",
  createLedgerCurrency: "Betriebswährung",
  createLedgerHistoryStart: "Bücher beginnen am",
  createLedgerOpeningAccount: "Eröffnungskonto",
  createLedgerOpeningAmount: "Eröffnungssaldo (optional)",
  createLedgerReviewOpening: "Eröffnungssaldo: {{account}} {{amount}}",
  createLedgerAmountOwed: "Geschuldeter Betrag (optional)",
  createLedgerOpeningNone: "Später entscheiden",
  createLedgerReview: "Überprüfen",
  createLedgerReviewDescription:
    "Genau das wird erstellt. Gehen Sie zurück, um etwas zu ändern.",
  createLedgerAccounts: "Konten",
  createLedgerAmountInvalid: "Geben Sie einen Betrag wie 100 oder -30.50 ein",
  createLedgerAmountReenter:
    "Geben Sie den Eröffnungssaldo erneut ein oder wählen Sie „Später entscheiden“. Er wird nicht im gespeicherten Entwurf aufbewahrt.",
  createLedgerCurrencyInvalid:
    "Wählen Sie einen Währungscode wie USD oder EUR.",
  createLedgerHistoryStartInvalid:
    "Geben Sie ein gültiges Datum wie 2026-01-01 ein.",
  createLedgerPresetPersonal: "Persönliches Buch",
  createLedgerPresetPersonalOutcome:
    "Erfassen Sie einen Kauf und verstehen Sie seine Wirkung auf Ihr Guthaben.",
  createLedgerPresetFreelance: "Freiberufler-Buch",
  createLedgerPresetFreelanceOutcome:
    "Erfassen Sie Kundeneinnahmen oder sehen Sie, was ein unbezahlter Kunde noch schuldet.",
  createLedgerPresetBusiness: "Geschäftsbuch",
  createLedgerPresetBusinessOutcome:
    "Richten Sie eine Eröffnungsposition ein und unterscheiden Sie Finanzierung von Umsatz.",
  createLedgerPresetPortfolio: "Portfolio-Buch",
  createLedgerPresetPortfolioOutcome:
    "Erfassen Sie einen Kauf und prüfen Sie Stückzahlen, Anschaffungsnachweise und Geldbewegung.",
  createLedgerPresetRental: "Mietbuch",
  createLedgerPresetRentalOutcome:
    "Erfassen Sie Einnahmen und unterscheiden Sie Miete von einer rückzahlbaren Kaution.",
  createLedgerPresetShared: "Buch für gemeinsame Ausgaben",
  createLedgerPresetSharedOutcome:
    "Erfassen Sie einen Vorschuss und sehen Sie, wer wem schuldet.",
  createLedgerPresetCommunity: "Gemeinschaftsbuch",
  createLedgerPresetCommunityOutcome:
    "Erklären Sie Beiträge, Projektausgaben und verbleibende Mittel.",
  createLedgerPresetBlank: "Leeres Buch",
  createLedgerPresetBlankOutcome:
    "Fügen Sie eine gewählte Struktur hinzu, ohne unerwünschte Kategorien zu entfernen.",
};
