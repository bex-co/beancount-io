import type { SupportedLanguage, TranslationEntry } from "@/i18n";

const enMessages = {
  "userSettings.apiKeys": "Personal access tokens",
  "userSettings.apiKeysDescription":
    "Create scoped credentials for scripts and integrations that use the Beancount.io API.",
  "userSettings.apiKeyNew": "New token",
  "userSettings.apiKeysLoading": "Loading personal access tokens…",
  "userSettings.apiKeysLoadFailed": "Failed to load personal access tokens",
  "userSettings.apiKeysLoadFailedDescription":
    "We could not load your tokens. Try again.",
  "userSettings.apiKeysRetry": "Try again",
  "userSettings.apiKeysEmpty": "No personal access tokens",
  "userSettings.apiKeysEmptyDescription":
    "Create a token when a script or integration needs API access.",
  "userSettings.createPersonalAccessToken": "Create personal access token",
  "userSettings.createPersonalAccessTokenDescription":
    "Choose only the access this token needs. Token creation requires a paid plan.",
  "userSettings.apiKeyCreateFailed": "Could not create token",
  "userSettings.apiKeyName": "Token name",
  "userSettings.apiKeyNamePlaceholder": "e.g. Monthly reporting script",
  "userSettings.apiKeyNameDescription":
    "Use a name that identifies where this token will be used.",
  "userSettings.apiKeyScopes": "Permissions",
  "userSettings.apiKeyScopesDescription":
    "Start with read access and grant more only when required.",
  "userSettings.apiKeyReadScopeDescription": "Read ledger data.",
  "userSettings.apiKeyWriteScopeDescription": "Create and update ledger data.",
  "userSettings.apiKeyAdminScopeDescription":
    "Perform administrative ledger operations.",
  "userSettings.apiKeyLedgerScope": "Ledger restriction (optional)",
  "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
  "userSettings.apiKeyLedgerScopeDescription":
    "Restrict this token to one ledger using owner/ledger.",
  "userSettings.apiKeyExpiration": "Expiration date (optional)",
  "userSettings.apiKeyExpirationDescription":
    "The token remains valid until the end of this UTC date.",
  "userSettings.apiKeyPaidFeature":
    "Personal access tokens are available on paid plans. If your plan is not eligible, creation will not proceed.",
  "userSettings.apiKeyCreating": "Creating…",
  "userSettings.apiKeyCreate": "Create token",
  "userSettings.apiKeyCreated": "Token created",
  "userSettings.apiKeyCreatedDescription":
    "Your personal access token is ready.",
  "userSettings.apiKeyCopyNow": "Copy this token now",
  "userSettings.apiKeySecretWarning":
    "For your security, Beancount.io will not show this token again. Store it in a secret manager.",
  "userSettings.personalAccessToken": "Personal access token",
  "userSettings.apiKeyDone": "Done",
  "userSettings.apiKeyNameRequired": "Enter a token name.",
  "userSettings.apiKeyNameTooLong":
    "Token names must be 100 characters or fewer.",
  "userSettings.apiKeyScopeRequired": "Select at least one permission.",
  "userSettings.apiKeyLedgerScopeInvalid":
    "Use owner/ledger format for the ledger restriction.",
  "userSettings.apiKeyExpirationFuture":
    "Choose an expiration date in the future.",
  "userSettings.apiKeySecretMissing":
    "The server did not return the new token. Please try again.",
  "userSettings.apiKeyActive": "Active",
  "userSettings.apiKeyExpired": "Expired",
  "userSettings.apiKeyRevoked": "Revoked",
  "userSettings.apiKeyLedger": "Ledger",
  "userSettings.apiKeyAllLedgers": "All ledgers",
  "userSettings.apiKeyCreatedAt": "Created",
  "userSettings.apiKeyLastUsed": "Last used",
  "userSettings.apiKeyExpiresAt": "Expires",
  "userSettings.apiKeyNoExpiration": "No expiration",
  "userSettings.apiKeyRevoke": "Revoke",
  "userSettings.apiKeyRevokeTitle": "Revoke personal access token?",
  "userSettings.apiKeyRevokeDescription":
    'Revoke "{name}" immediately? Clients using it will lose access.',
  "userSettings.apiKeyRevoking": "Revoking…",
  "userSettings.apiKeyRevokedSuccess": "Personal access token revoked",
} as const;

type ApiKeyMessages = Record<keyof typeof enMessages, string>;

const translations: Record<SupportedLanguage, ApiKeyMessages> = {
  en: enMessages,
  bg: {
    "userSettings.apiKeys": "Лични токени за достъп",
    "userSettings.apiKeysDescription":
      "Създавайте ограничени идентификационни данни за скриптове и интеграции с API на Beancount.io.",
    "userSettings.apiKeyNew": "Нов токен",
    "userSettings.apiKeysLoading": "Зареждане на личните токени…",
    "userSettings.apiKeysLoadFailed": "Личните токени не могат да се заредят",
    "userSettings.apiKeysLoadFailedDescription":
      "Не успяхме да заредим токените ви. Опитайте отново.",
    "userSettings.apiKeysRetry": "Опитайте отново",
    "userSettings.apiKeysEmpty": "Няма лични токени за достъп",
    "userSettings.apiKeysEmptyDescription":
      "Създайте токен, когато скрипт или интеграция се нуждае от API достъп.",
    "userSettings.createPersonalAccessToken": "Създаване на личен токен",
    "userSettings.createPersonalAccessTokenDescription":
      "Изберете само необходимия достъп. Създаването изисква платен план.",
    "userSettings.apiKeyCreateFailed": "Токенът не може да се създаде",
    "userSettings.apiKeyName": "Име на токена",
    "userSettings.apiKeyNamePlaceholder": "напр. Скрипт за месечни отчети",
    "userSettings.apiKeyNameDescription":
      "Използвайте име, което показва къде ще се използва токенът.",
    "userSettings.apiKeyScopes": "Разрешения",
    "userSettings.apiKeyScopesDescription":
      "Започнете с достъп за четене и добавяйте само при нужда.",
    "userSettings.apiKeyReadScopeDescription": "Четене на данни от книгата.",
    "userSettings.apiKeyWriteScopeDescription":
      "Създаване и промяна на данни в книгата.",
    "userSettings.apiKeyAdminScopeDescription":
      "Административни операции с книгата.",
    "userSettings.apiKeyLedgerScope": "Ограничение до книга (по избор)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Ограничете токена до една книга чрез owner/ledger.",
    "userSettings.apiKeyExpiration": "Дата на изтичане (по избор)",
    "userSettings.apiKeyExpirationDescription":
      "Токенът е валиден до края на тази UTC дата.",
    "userSettings.apiKeyPaidFeature":
      "Личните токени са налични в платените планове. При неподходящ план създаването няма да продължи.",
    "userSettings.apiKeyCreating": "Създаване…",
    "userSettings.apiKeyCreate": "Създай токен",
    "userSettings.apiKeyCreated": "Токенът е създаден",
    "userSettings.apiKeyCreatedDescription": "Личният ви токен е готов.",
    "userSettings.apiKeyCopyNow": "Копирайте токена сега",
    "userSettings.apiKeySecretWarning":
      "За сигурност Beancount.io няма да го покаже отново. Запазете го в мениджър на тайни.",
    "userSettings.personalAccessToken": "Личен токен за достъп",
    "userSettings.apiKeyDone": "Готово",
    "userSettings.apiKeyNameRequired": "Въведете име на токена.",
    "userSettings.apiKeyNameTooLong": "Името може да е до 100 знака.",
    "userSettings.apiKeyScopeRequired": "Изберете поне едно разрешение.",
    "userSettings.apiKeyLedgerScopeInvalid": "Използвайте формат owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Изберете бъдеща дата.",
    "userSettings.apiKeySecretMissing":
      "Сървърът не върна новия токен. Опитайте отново.",
    "userSettings.apiKeyActive": "Активен",
    "userSettings.apiKeyExpired": "Изтекъл",
    "userSettings.apiKeyRevoked": "Отменен",
    "userSettings.apiKeyLedger": "Книга",
    "userSettings.apiKeyAllLedgers": "Всички книги",
    "userSettings.apiKeyCreatedAt": "Създаден",
    "userSettings.apiKeyLastUsed": "Последно използван",
    "userSettings.apiKeyExpiresAt": "Изтича",
    "userSettings.apiKeyNoExpiration": "Без срок",
    "userSettings.apiKeyRevoke": "Отмени",
    "userSettings.apiKeyRevokeTitle": "Отмяна на личния токен?",
    "userSettings.apiKeyRevokeDescription":
      "Да се отмени ли „{name}“ незабавно? Клиентите ще загубят достъп.",
    "userSettings.apiKeyRevoking": "Отмяна…",
    "userSettings.apiKeyRevokedSuccess": "Личният токен е отменен",
  },
  ca: {
    "userSettings.apiKeys": "Tokens d'accés personal",
    "userSettings.apiKeysDescription":
      "Crea credencials limitades per a scripts i integracions que utilitzen l'API de Beancount.io.",
    "userSettings.apiKeyNew": "Token nou",
    "userSettings.apiKeysLoading": "S'estan carregant els tokens…",
    "userSettings.apiKeysLoadFailed": "No s'han pogut carregar els tokens",
    "userSettings.apiKeysLoadFailedDescription":
      "No hem pogut carregar els teus tokens. Torna-ho a provar.",
    "userSettings.apiKeysRetry": "Torna-ho a provar",
    "userSettings.apiKeysEmpty": "No hi ha tokens d'accés personal",
    "userSettings.apiKeysEmptyDescription":
      "Crea un token quan un script o una integració necessiti accés a l'API.",
    "userSettings.createPersonalAccessToken": "Crea un token d'accés personal",
    "userSettings.createPersonalAccessTokenDescription":
      "Tria només l'accés necessari. Cal un pla de pagament.",
    "userSettings.apiKeyCreateFailed": "No s'ha pogut crear el token",
    "userSettings.apiKeyName": "Nom del token",
    "userSettings.apiKeyNamePlaceholder": "p. ex. Script d'informes mensuals",
    "userSettings.apiKeyNameDescription":
      "Utilitza un nom que identifiqui on s'utilitzarà.",
    "userSettings.apiKeyScopes": "Permisos",
    "userSettings.apiKeyScopesDescription":
      "Comença amb lectura i concedeix més accés només quan calgui.",
    "userSettings.apiKeyReadScopeDescription": "Llegeix les dades del llibre.",
    "userSettings.apiKeyWriteScopeDescription":
      "Crea i actualitza les dades del llibre.",
    "userSettings.apiKeyAdminScopeDescription":
      "Executa operacions administratives del llibre.",
    "userSettings.apiKeyLedgerScope": "Restricció de llibre (opcional)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Limita el token a un llibre amb owner/ledger.",
    "userSettings.apiKeyExpiration": "Data de caducitat (opcional)",
    "userSettings.apiKeyExpirationDescription":
      "El token és vàlid fins al final d'aquesta data UTC.",
    "userSettings.apiKeyPaidFeature":
      "Els tokens personals estan disponibles als plans de pagament. Si el pla no és apte, no es crearan.",
    "userSettings.apiKeyCreating": "S'està creant…",
    "userSettings.apiKeyCreate": "Crea el token",
    "userSettings.apiKeyCreated": "Token creat",
    "userSettings.apiKeyCreatedDescription":
      "El teu token d'accés personal està a punt.",
    "userSettings.apiKeyCopyNow": "Copia aquest token ara",
    "userSettings.apiKeySecretWarning":
      "Per seguretat, Beancount.io no el tornarà a mostrar. Desa'l en un gestor de secrets.",
    "userSettings.personalAccessToken": "Token d'accés personal",
    "userSettings.apiKeyDone": "Fet",
    "userSettings.apiKeyNameRequired": "Introdueix un nom per al token.",
    "userSettings.apiKeyNameTooLong":
      "El nom ha de tenir 100 caràcters o menys.",
    "userSettings.apiKeyScopeRequired": "Selecciona almenys un permís.",
    "userSettings.apiKeyLedgerScopeInvalid": "Utilitza el format owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Tria una data futura.",
    "userSettings.apiKeySecretMissing":
      "El servidor no ha retornat el token. Torna-ho a provar.",
    "userSettings.apiKeyActive": "Actiu",
    "userSettings.apiKeyExpired": "Caducat",
    "userSettings.apiKeyRevoked": "Revocat",
    "userSettings.apiKeyLedger": "Llibre",
    "userSettings.apiKeyAllLedgers": "Tots els llibres",
    "userSettings.apiKeyCreatedAt": "Creat",
    "userSettings.apiKeyLastUsed": "Darrer ús",
    "userSettings.apiKeyExpiresAt": "Caduca",
    "userSettings.apiKeyNoExpiration": "Sense caducitat",
    "userSettings.apiKeyRevoke": "Revoca",
    "userSettings.apiKeyRevokeTitle": "Vols revocar el token?",
    "userSettings.apiKeyRevokeDescription":
      "Vols revocar «{name}» immediatament? Els clients perdran l'accés.",
    "userSettings.apiKeyRevoking": "S'està revocant…",
    "userSettings.apiKeyRevokedSuccess": "Token d'accés personal revocat",
  },
  de: {
    "userSettings.apiKeys": "Persönliche Zugriffstoken",
    "userSettings.apiKeysDescription":
      "Erstelle eingeschränkte Zugangsdaten für Skripte und Integrationen mit der Beancount.io-API.",
    "userSettings.apiKeyNew": "Neues Token",
    "userSettings.apiKeysLoading": "Zugriffstoken werden geladen…",
    "userSettings.apiKeysLoadFailed":
      "Zugriffstoken konnten nicht geladen werden",
    "userSettings.apiKeysLoadFailedDescription":
      "Deine Token konnten nicht geladen werden. Versuche es erneut.",
    "userSettings.apiKeysRetry": "Erneut versuchen",
    "userSettings.apiKeysEmpty": "Keine persönlichen Zugriffstoken",
    "userSettings.apiKeysEmptyDescription":
      "Erstelle ein Token, wenn ein Skript oder eine Integration API-Zugriff benötigt.",
    "userSettings.createPersonalAccessToken":
      "Persönliches Zugriffstoken erstellen",
    "userSettings.createPersonalAccessTokenDescription":
      "Wähle nur den nötigen Zugriff. Die Erstellung erfordert einen kostenpflichtigen Plan.",
    "userSettings.apiKeyCreateFailed": "Token konnte nicht erstellt werden",
    "userSettings.apiKeyName": "Tokenname",
    "userSettings.apiKeyNamePlaceholder": "z. B. Monatliches Berichtsskript",
    "userSettings.apiKeyNameDescription":
      "Wähle einen Namen, der den Einsatzort des Tokens beschreibt.",
    "userSettings.apiKeyScopes": "Berechtigungen",
    "userSettings.apiKeyScopesDescription":
      "Beginne mit Lesezugriff und gewähre mehr nur bei Bedarf.",
    "userSettings.apiKeyReadScopeDescription": "Ledger-Daten lesen.",
    "userSettings.apiKeyWriteScopeDescription":
      "Ledger-Daten erstellen und ändern.",
    "userSettings.apiKeyAdminScopeDescription":
      "Administrative Ledger-Aktionen ausführen.",
    "userSettings.apiKeyLedgerScope": "Ledger-Beschränkung (optional)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Beschränke das Token mit owner/ledger auf ein Ledger.",
    "userSettings.apiKeyExpiration": "Ablaufdatum (optional)",
    "userSettings.apiKeyExpirationDescription":
      "Das Token gilt bis zum Ende dieses UTC-Datums.",
    "userSettings.apiKeyPaidFeature":
      "Persönliche Zugriffstoken sind in kostenpflichtigen Plänen verfügbar. Bei einem ungeeigneten Plan wird keines erstellt.",
    "userSettings.apiKeyCreating": "Wird erstellt…",
    "userSettings.apiKeyCreate": "Token erstellen",
    "userSettings.apiKeyCreated": "Token erstellt",
    "userSettings.apiKeyCreatedDescription":
      "Dein persönliches Zugriffstoken ist bereit.",
    "userSettings.apiKeyCopyNow": "Token jetzt kopieren",
    "userSettings.apiKeySecretWarning":
      "Aus Sicherheitsgründen zeigt Beancount.io dieses Token nicht erneut. Speichere es in einem Secret Manager.",
    "userSettings.personalAccessToken": "Persönliches Zugriffstoken",
    "userSettings.apiKeyDone": "Fertig",
    "userSettings.apiKeyNameRequired": "Gib einen Tokennamen ein.",
    "userSettings.apiKeyNameTooLong":
      "Tokennamen dürfen höchstens 100 Zeichen lang sein.",
    "userSettings.apiKeyScopeRequired": "Wähle mindestens eine Berechtigung.",
    "userSettings.apiKeyLedgerScopeInvalid":
      "Verwende das Format owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Wähle ein zukünftiges Datum.",
    "userSettings.apiKeySecretMissing":
      "Der Server hat kein Token zurückgegeben. Versuche es erneut.",
    "userSettings.apiKeyActive": "Aktiv",
    "userSettings.apiKeyExpired": "Abgelaufen",
    "userSettings.apiKeyRevoked": "Widerrufen",
    "userSettings.apiKeyLedger": "Ledger",
    "userSettings.apiKeyAllLedgers": "Alle Ledger",
    "userSettings.apiKeyCreatedAt": "Erstellt",
    "userSettings.apiKeyLastUsed": "Zuletzt verwendet",
    "userSettings.apiKeyExpiresAt": "Läuft ab",
    "userSettings.apiKeyNoExpiration": "Kein Ablaufdatum",
    "userSettings.apiKeyRevoke": "Widerrufen",
    "userSettings.apiKeyRevokeTitle": "Zugriffstoken widerrufen?",
    "userSettings.apiKeyRevokeDescription":
      "„{name}“ sofort widerrufen? Verwendende Clients verlieren den Zugriff.",
    "userSettings.apiKeyRevoking": "Wird widerrufen…",
    "userSettings.apiKeyRevokedSuccess":
      "Persönliches Zugriffstoken widerrufen",
  },
  es: {
    "userSettings.apiKeys": "Tokens de acceso personal",
    "userSettings.apiKeysDescription":
      "Crea credenciales limitadas para scripts e integraciones que usan la API de Beancount.io.",
    "userSettings.apiKeyNew": "Nuevo token",
    "userSettings.apiKeysLoading": "Cargando tokens de acceso…",
    "userSettings.apiKeysLoadFailed": "No se pudieron cargar los tokens",
    "userSettings.apiKeysLoadFailedDescription":
      "No pudimos cargar tus tokens. Inténtalo de nuevo.",
    "userSettings.apiKeysRetry": "Intentar de nuevo",
    "userSettings.apiKeysEmpty": "No hay tokens de acceso personal",
    "userSettings.apiKeysEmptyDescription":
      "Crea un token cuando un script o integración necesite acceso a la API.",
    "userSettings.createPersonalAccessToken": "Crear token de acceso personal",
    "userSettings.createPersonalAccessTokenDescription":
      "Elige solo el acceso necesario. Se requiere un plan de pago.",
    "userSettings.apiKeyCreateFailed": "No se pudo crear el token",
    "userSettings.apiKeyName": "Nombre del token",
    "userSettings.apiKeyNamePlaceholder":
      "p. ej., Script de informes mensuales",
    "userSettings.apiKeyNameDescription":
      "Usa un nombre que identifique dónde se utilizará.",
    "userSettings.apiKeyScopes": "Permisos",
    "userSettings.apiKeyScopesDescription":
      "Empieza con lectura y concede más acceso solo cuando sea necesario.",
    "userSettings.apiKeyReadScopeDescription": "Leer datos del libro.",
    "userSettings.apiKeyWriteScopeDescription":
      "Crear y actualizar datos del libro.",
    "userSettings.apiKeyAdminScopeDescription":
      "Realizar operaciones administrativas del libro.",
    "userSettings.apiKeyLedgerScope": "Restricción de libro (opcional)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Restringe el token a un libro con owner/ledger.",
    "userSettings.apiKeyExpiration": "Fecha de vencimiento (opcional)",
    "userSettings.apiKeyExpirationDescription":
      "El token es válido hasta el final de esta fecha UTC.",
    "userSettings.apiKeyPaidFeature":
      "Los tokens personales están disponibles en planes de pago. Si tu plan no cumple los requisitos, no se crearán.",
    "userSettings.apiKeyCreating": "Creando…",
    "userSettings.apiKeyCreate": "Crear token",
    "userSettings.apiKeyCreated": "Token creado",
    "userSettings.apiKeyCreatedDescription":
      "Tu token de acceso personal está listo.",
    "userSettings.apiKeyCopyNow": "Copia este token ahora",
    "userSettings.apiKeySecretWarning":
      "Por seguridad, Beancount.io no volverá a mostrarlo. Guárdalo en un gestor de secretos.",
    "userSettings.personalAccessToken": "Token de acceso personal",
    "userSettings.apiKeyDone": "Listo",
    "userSettings.apiKeyNameRequired": "Introduce un nombre para el token.",
    "userSettings.apiKeyNameTooLong":
      "El nombre debe tener 100 caracteres o menos.",
    "userSettings.apiKeyScopeRequired": "Selecciona al menos un permiso.",
    "userSettings.apiKeyLedgerScopeInvalid": "Usa el formato owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Elige una fecha futura.",
    "userSettings.apiKeySecretMissing":
      "El servidor no devolvió el token. Inténtalo de nuevo.",
    "userSettings.apiKeyActive": "Activo",
    "userSettings.apiKeyExpired": "Vencido",
    "userSettings.apiKeyRevoked": "Revocado",
    "userSettings.apiKeyLedger": "Libro",
    "userSettings.apiKeyAllLedgers": "Todos los libros",
    "userSettings.apiKeyCreatedAt": "Creado",
    "userSettings.apiKeyLastUsed": "Último uso",
    "userSettings.apiKeyExpiresAt": "Vence",
    "userSettings.apiKeyNoExpiration": "Sin vencimiento",
    "userSettings.apiKeyRevoke": "Revocar",
    "userSettings.apiKeyRevokeTitle": "¿Revocar el token de acceso?",
    "userSettings.apiKeyRevokeDescription":
      "¿Revocar «{name}» inmediatamente? Los clientes perderán el acceso.",
    "userSettings.apiKeyRevoking": "Revocando…",
    "userSettings.apiKeyRevokedSuccess": "Token de acceso personal revocado",
  },
  fr: {
    "userSettings.apiKeys": "Jetons d’accès personnels",
    "userSettings.apiKeysDescription":
      "Créez des identifiants limités pour les scripts et intégrations utilisant l’API Beancount.io.",
    "userSettings.apiKeyNew": "Nouveau jeton",
    "userSettings.apiKeysLoading": "Chargement des jetons…",
    "userSettings.apiKeysLoadFailed": "Impossible de charger les jetons",
    "userSettings.apiKeysLoadFailedDescription":
      "Nous n’avons pas pu charger vos jetons. Réessayez.",
    "userSettings.apiKeysRetry": "Réessayer",
    "userSettings.apiKeysEmpty": "Aucun jeton d’accès personnel",
    "userSettings.apiKeysEmptyDescription":
      "Créez un jeton lorsqu’un script ou une intégration a besoin de l’API.",
    "userSettings.createPersonalAccessToken":
      "Créer un jeton d’accès personnel",
    "userSettings.createPersonalAccessTokenDescription":
      "Choisissez uniquement l’accès nécessaire. Un forfait payant est requis.",
    "userSettings.apiKeyCreateFailed": "Impossible de créer le jeton",
    "userSettings.apiKeyName": "Nom du jeton",
    "userSettings.apiKeyNamePlaceholder": "p. ex. Script de rapport mensuel",
    "userSettings.apiKeyNameDescription":
      "Utilisez un nom indiquant où ce jeton sera utilisé.",
    "userSettings.apiKeyScopes": "Autorisations",
    "userSettings.apiKeyScopesDescription":
      "Commencez par la lecture et accordez davantage uniquement si nécessaire.",
    "userSettings.apiKeyReadScopeDescription": "Lire les données du registre.",
    "userSettings.apiKeyWriteScopeDescription":
      "Créer et modifier les données du registre.",
    "userSettings.apiKeyAdminScopeDescription":
      "Effectuer des opérations administratives sur le registre.",
    "userSettings.apiKeyLedgerScope": "Restriction au registre (facultatif)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Limitez ce jeton à un registre avec owner/ledger.",
    "userSettings.apiKeyExpiration": "Date d’expiration (facultatif)",
    "userSettings.apiKeyExpirationDescription":
      "Le jeton reste valide jusqu’à la fin de cette date UTC.",
    "userSettings.apiKeyPaidFeature":
      "Les jetons personnels sont disponibles avec les forfaits payants. Si votre forfait n’est pas admissible, la création échouera.",
    "userSettings.apiKeyCreating": "Création…",
    "userSettings.apiKeyCreate": "Créer le jeton",
    "userSettings.apiKeyCreated": "Jeton créé",
    "userSettings.apiKeyCreatedDescription":
      "Votre jeton d’accès personnel est prêt.",
    "userSettings.apiKeyCopyNow": "Copiez ce jeton maintenant",
    "userSettings.apiKeySecretWarning":
      "Pour votre sécurité, Beancount.io ne l’affichera plus. Enregistrez-le dans un gestionnaire de secrets.",
    "userSettings.personalAccessToken": "Jeton d’accès personnel",
    "userSettings.apiKeyDone": "Terminé",
    "userSettings.apiKeyNameRequired": "Saisissez un nom de jeton.",
    "userSettings.apiKeyNameTooLong":
      "Le nom doit contenir au maximum 100 caractères.",
    "userSettings.apiKeyScopeRequired":
      "Sélectionnez au moins une autorisation.",
    "userSettings.apiKeyLedgerScopeInvalid": "Utilisez le format owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Choisissez une date future.",
    "userSettings.apiKeySecretMissing":
      "Le serveur n’a pas renvoyé le jeton. Réessayez.",
    "userSettings.apiKeyActive": "Actif",
    "userSettings.apiKeyExpired": "Expiré",
    "userSettings.apiKeyRevoked": "Révoqué",
    "userSettings.apiKeyLedger": "Registre",
    "userSettings.apiKeyAllLedgers": "Tous les registres",
    "userSettings.apiKeyCreatedAt": "Créé",
    "userSettings.apiKeyLastUsed": "Dernière utilisation",
    "userSettings.apiKeyExpiresAt": "Expire",
    "userSettings.apiKeyNoExpiration": "Sans expiration",
    "userSettings.apiKeyRevoke": "Révoquer",
    "userSettings.apiKeyRevokeTitle": "Révoquer le jeton d’accès ?",
    "userSettings.apiKeyRevokeDescription":
      "Révoquer « {name} » immédiatement ? Les clients perdront l’accès.",
    "userSettings.apiKeyRevoking": "Révocation…",
    "userSettings.apiKeyRevokedSuccess": "Jeton d’accès personnel révoqué",
  },
  fa: {
    "userSettings.apiKeys": "توکن‌های دسترسی شخصی",
    "userSettings.apiKeysDescription":
      "برای اسکریپت‌ها و یکپارچه‌سازی‌های API در Beancount.io اعتبارنامه با دسترسی محدود بسازید.",
    "userSettings.apiKeyNew": "توکن جدید",
    "userSettings.apiKeysLoading": "در حال بارگیری توکن‌ها…",
    "userSettings.apiKeysLoadFailed": "بارگیری توکن‌ها ناموفق بود",
    "userSettings.apiKeysLoadFailedDescription":
      "توکن‌های شما بارگیری نشد. دوباره تلاش کنید.",
    "userSettings.apiKeysRetry": "تلاش دوباره",
    "userSettings.apiKeysEmpty": "توکن دسترسی شخصی ندارید",
    "userSettings.apiKeysEmptyDescription":
      "وقتی اسکریپت یا یکپارچه‌سازی به API نیاز دارد، توکن بسازید.",
    "userSettings.createPersonalAccessToken": "ساخت توکن دسترسی شخصی",
    "userSettings.createPersonalAccessTokenDescription":
      "فقط دسترسی لازم را انتخاب کنید. ساخت توکن به طرح پولی نیاز دارد.",
    "userSettings.apiKeyCreateFailed": "توکن ساخته نشد",
    "userSettings.apiKeyName": "نام توکن",
    "userSettings.apiKeyNamePlaceholder": "مثلاً اسکریپت گزارش ماهانه",
    "userSettings.apiKeyNameDescription":
      "نامی انتخاب کنید که محل استفاده توکن را مشخص کند.",
    "userSettings.apiKeyScopes": "مجوزها",
    "userSettings.apiKeyScopesDescription":
      "با دسترسی خواندن شروع کنید و فقط در صورت نیاز دسترسی بیشتری بدهید.",
    "userSettings.apiKeyReadScopeDescription": "خواندن داده‌های دفتر.",
    "userSettings.apiKeyWriteScopeDescription": "ایجاد و ویرایش داده‌های دفتر.",
    "userSettings.apiKeyAdminScopeDescription": "انجام عملیات مدیریتی دفتر.",
    "userSettings.apiKeyLedgerScope": "محدودیت دفتر (اختیاری)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "توکن را با owner/ledger به یک دفتر محدود کنید.",
    "userSettings.apiKeyExpiration": "تاریخ انقضا (اختیاری)",
    "userSettings.apiKeyExpirationDescription":
      "توکن تا پایان این تاریخ UTC معتبر است.",
    "userSettings.apiKeyPaidFeature":
      "توکن‌های شخصی در طرح‌های پولی ارائه می‌شوند. اگر طرح شما واجد شرایط نباشد، توکن ساخته نمی‌شود.",
    "userSettings.apiKeyCreating": "در حال ساخت…",
    "userSettings.apiKeyCreate": "ساخت توکن",
    "userSettings.apiKeyCreated": "توکن ساخته شد",
    "userSettings.apiKeyCreatedDescription": "توکن دسترسی شخصی شما آماده است.",
    "userSettings.apiKeyCopyNow": "اکنون توکن را کپی کنید",
    "userSettings.apiKeySecretWarning":
      "برای امنیت، Beancount.io این توکن را دوباره نمایش نمی‌دهد. آن را در مدیر اسرار ذخیره کنید.",
    "userSettings.personalAccessToken": "توکن دسترسی شخصی",
    "userSettings.apiKeyDone": "انجام شد",
    "userSettings.apiKeyNameRequired": "نام توکن را وارد کنید.",
    "userSettings.apiKeyNameTooLong": "نام توکن باید حداکثر ۱۰۰ نویسه باشد.",
    "userSettings.apiKeyScopeRequired": "حداقل یک مجوز انتخاب کنید.",
    "userSettings.apiKeyLedgerScopeInvalid":
      "از قالب owner/ledger استفاده کنید.",
    "userSettings.apiKeyExpirationFuture": "یک تاریخ آینده انتخاب کنید.",
    "userSettings.apiKeySecretMissing":
      "سرور توکن جدید را برنگرداند. دوباره تلاش کنید.",
    "userSettings.apiKeyActive": "فعال",
    "userSettings.apiKeyExpired": "منقضی",
    "userSettings.apiKeyRevoked": "لغوشده",
    "userSettings.apiKeyLedger": "دفتر",
    "userSettings.apiKeyAllLedgers": "همه دفترها",
    "userSettings.apiKeyCreatedAt": "ساخته‌شده",
    "userSettings.apiKeyLastUsed": "آخرین استفاده",
    "userSettings.apiKeyExpiresAt": "انقضا",
    "userSettings.apiKeyNoExpiration": "بدون انقضا",
    "userSettings.apiKeyRevoke": "لغو",
    "userSettings.apiKeyRevokeTitle": "توکن دسترسی لغو شود؟",
    "userSettings.apiKeyRevokeDescription":
      "«{name}» فوراً لغو شود؟ سرویس‌های استفاده‌کننده دسترسی را از دست می‌دهند.",
    "userSettings.apiKeyRevoking": "در حال لغو…",
    "userSettings.apiKeyRevokedSuccess": "توکن دسترسی شخصی لغو شد",
  },
  ja: {
    "userSettings.apiKeys": "個人アクセストークン",
    "userSettings.apiKeysDescription":
      "Beancount.io API を使うスクリプトや連携用に、権限を限定した認証情報を作成します。",
    "userSettings.apiKeyNew": "新しいトークン",
    "userSettings.apiKeysLoading": "個人アクセストークンを読み込み中…",
    "userSettings.apiKeysLoadFailed": "トークンを読み込めませんでした",
    "userSettings.apiKeysLoadFailedDescription":
      "トークンを読み込めませんでした。もう一度お試しください。",
    "userSettings.apiKeysRetry": "再試行",
    "userSettings.apiKeysEmpty": "個人アクセストークンはありません",
    "userSettings.apiKeysEmptyDescription":
      "スクリプトや連携に API アクセスが必要な場合にトークンを作成します。",
    "userSettings.createPersonalAccessToken": "個人アクセストークンを作成",
    "userSettings.createPersonalAccessTokenDescription":
      "必要な権限だけを選択してください。作成には有料プランが必要です。",
    "userSettings.apiKeyCreateFailed": "トークンを作成できませんでした",
    "userSettings.apiKeyName": "トークン名",
    "userSettings.apiKeyNamePlaceholder": "例：月次レポートスクリプト",
    "userSettings.apiKeyNameDescription":
      "使用場所が分かる名前を付けてください。",
    "userSettings.apiKeyScopes": "権限",
    "userSettings.apiKeyScopesDescription":
      "読み取り権限から始め、必要な場合だけ追加してください。",
    "userSettings.apiKeyReadScopeDescription": "台帳データを読み取ります。",
    "userSettings.apiKeyWriteScopeDescription":
      "台帳データを作成・更新します。",
    "userSettings.apiKeyAdminScopeDescription": "台帳の管理操作を実行します。",
    "userSettings.apiKeyLedgerScope": "台帳の制限（任意）",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "owner/ledger で 1 つの台帳に制限します。",
    "userSettings.apiKeyExpiration": "有効期限（任意）",
    "userSettings.apiKeyExpirationDescription":
      "この UTC 日付の終了まで有効です。",
    "userSettings.apiKeyPaidFeature":
      "個人アクセストークンは有料プランで利用できます。対象外のプランでは作成されません。",
    "userSettings.apiKeyCreating": "作成中…",
    "userSettings.apiKeyCreate": "トークンを作成",
    "userSettings.apiKeyCreated": "トークンを作成しました",
    "userSettings.apiKeyCreatedDescription":
      "個人アクセストークンを利用できます。",
    "userSettings.apiKeyCopyNow": "今すぐコピーしてください",
    "userSettings.apiKeySecretWarning":
      "安全のため、Beancount.io で再表示することはできません。シークレット管理ツールに保存してください。",
    "userSettings.personalAccessToken": "個人アクセストークン",
    "userSettings.apiKeyDone": "完了",
    "userSettings.apiKeyNameRequired": "トークン名を入力してください。",
    "userSettings.apiKeyNameTooLong":
      "トークン名は 100 文字以内にしてください。",
    "userSettings.apiKeyScopeRequired": "権限を 1 つ以上選択してください。",
    "userSettings.apiKeyLedgerScopeInvalid":
      "owner/ledger 形式を使用してください。",
    "userSettings.apiKeyExpirationFuture": "未来の日付を選択してください。",
    "userSettings.apiKeySecretMissing":
      "サーバーから新しいトークンが返されませんでした。再試行してください。",
    "userSettings.apiKeyActive": "有効",
    "userSettings.apiKeyExpired": "期限切れ",
    "userSettings.apiKeyRevoked": "取り消し済み",
    "userSettings.apiKeyLedger": "台帳",
    "userSettings.apiKeyAllLedgers": "すべての台帳",
    "userSettings.apiKeyCreatedAt": "作成日",
    "userSettings.apiKeyLastUsed": "最終使用",
    "userSettings.apiKeyExpiresAt": "有効期限",
    "userSettings.apiKeyNoExpiration": "期限なし",
    "userSettings.apiKeyRevoke": "取り消す",
    "userSettings.apiKeyRevokeTitle": "個人アクセストークンを取り消しますか？",
    "userSettings.apiKeyRevokeDescription":
      "「{name}」を直ちに取り消しますか？使用中のクライアントはアクセスできなくなります。",
    "userSettings.apiKeyRevoking": "取り消し中…",
    "userSettings.apiKeyRevokedSuccess": "個人アクセストークンを取り消しました",
  },
  ko: {
    "userSettings.apiKeys": "개인 액세스 토큰",
    "userSettings.apiKeysDescription":
      "Beancount.io API를 사용하는 스크립트와 연동을 위한 제한된 자격 증명을 만듭니다.",
    "userSettings.apiKeyNew": "새 토큰",
    "userSettings.apiKeysLoading": "개인 액세스 토큰 불러오는 중…",
    "userSettings.apiKeysLoadFailed": "토큰을 불러오지 못했습니다",
    "userSettings.apiKeysLoadFailedDescription":
      "토큰을 불러오지 못했습니다. 다시 시도하세요.",
    "userSettings.apiKeysRetry": "다시 시도",
    "userSettings.apiKeysEmpty": "개인 액세스 토큰이 없습니다",
    "userSettings.apiKeysEmptyDescription":
      "스크립트나 연동에 API 접근이 필요할 때 토큰을 만드세요.",
    "userSettings.createPersonalAccessToken": "개인 액세스 토큰 만들기",
    "userSettings.createPersonalAccessTokenDescription":
      "필요한 권한만 선택하세요. 유료 플랜이 필요합니다.",
    "userSettings.apiKeyCreateFailed": "토큰을 만들 수 없습니다",
    "userSettings.apiKeyName": "토큰 이름",
    "userSettings.apiKeyNamePlaceholder": "예: 월간 보고서 스크립트",
    "userSettings.apiKeyNameDescription":
      "토큰 사용 위치를 알아볼 수 있는 이름을 사용하세요.",
    "userSettings.apiKeyScopes": "권한",
    "userSettings.apiKeyScopesDescription":
      "읽기 권한으로 시작하고 필요한 경우에만 추가 권한을 부여하세요.",
    "userSettings.apiKeyReadScopeDescription": "원장 데이터를 읽습니다.",
    "userSettings.apiKeyWriteScopeDescription":
      "원장 데이터를 만들고 수정합니다.",
    "userSettings.apiKeyAdminScopeDescription": "원장 관리 작업을 수행합니다.",
    "userSettings.apiKeyLedgerScope": "원장 제한(선택 사항)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "owner/ledger로 하나의 원장에 제한합니다.",
    "userSettings.apiKeyExpiration": "만료일(선택 사항)",
    "userSettings.apiKeyExpirationDescription":
      "이 UTC 날짜가 끝날 때까지 유효합니다.",
    "userSettings.apiKeyPaidFeature":
      "개인 액세스 토큰은 유료 플랜에서 사용할 수 있습니다. 대상 플랜이 아니면 생성되지 않습니다.",
    "userSettings.apiKeyCreating": "만드는 중…",
    "userSettings.apiKeyCreate": "토큰 만들기",
    "userSettings.apiKeyCreated": "토큰을 만들었습니다",
    "userSettings.apiKeyCreatedDescription":
      "개인 액세스 토큰을 사용할 수 있습니다.",
    "userSettings.apiKeyCopyNow": "지금 토큰을 복사하세요",
    "userSettings.apiKeySecretWarning":
      "보안을 위해 Beancount.io에서 다시 표시하지 않습니다. 비밀 관리 도구에 저장하세요.",
    "userSettings.personalAccessToken": "개인 액세스 토큰",
    "userSettings.apiKeyDone": "완료",
    "userSettings.apiKeyNameRequired": "토큰 이름을 입력하세요.",
    "userSettings.apiKeyNameTooLong": "토큰 이름은 100자 이하여야 합니다.",
    "userSettings.apiKeyScopeRequired": "권한을 하나 이상 선택하세요.",
    "userSettings.apiKeyLedgerScopeInvalid": "owner/ledger 형식을 사용하세요.",
    "userSettings.apiKeyExpirationFuture": "미래 날짜를 선택하세요.",
    "userSettings.apiKeySecretMissing":
      "서버가 새 토큰을 반환하지 않았습니다. 다시 시도하세요.",
    "userSettings.apiKeyActive": "활성",
    "userSettings.apiKeyExpired": "만료됨",
    "userSettings.apiKeyRevoked": "취소됨",
    "userSettings.apiKeyLedger": "원장",
    "userSettings.apiKeyAllLedgers": "모든 원장",
    "userSettings.apiKeyCreatedAt": "생성됨",
    "userSettings.apiKeyLastUsed": "마지막 사용",
    "userSettings.apiKeyExpiresAt": "만료",
    "userSettings.apiKeyNoExpiration": "만료 없음",
    "userSettings.apiKeyRevoke": "취소",
    "userSettings.apiKeyRevokeTitle": "개인 액세스 토큰을 취소할까요?",
    "userSettings.apiKeyRevokeDescription":
      "‘{name}’을 즉시 취소할까요? 사용 중인 클라이언트의 접근이 차단됩니다.",
    "userSettings.apiKeyRevoking": "취소 중…",
    "userSettings.apiKeyRevokedSuccess": "개인 액세스 토큰을 취소했습니다",
  },
  nl: {
    "userSettings.apiKeys": "Persoonlijke toegangstokens",
    "userSettings.apiKeysDescription":
      "Maak beperkte referenties voor scripts en integraties die de Beancount.io-API gebruiken.",
    "userSettings.apiKeyNew": "Nieuw token",
    "userSettings.apiKeysLoading": "Toegangstokens laden…",
    "userSettings.apiKeysLoadFailed":
      "Toegangstokens konden niet worden geladen",
    "userSettings.apiKeysLoadFailedDescription":
      "We konden je tokens niet laden. Probeer het opnieuw.",
    "userSettings.apiKeysRetry": "Opnieuw proberen",
    "userSettings.apiKeysEmpty": "Geen persoonlijke toegangstokens",
    "userSettings.apiKeysEmptyDescription":
      "Maak een token als een script of integratie API-toegang nodig heeft.",
    "userSettings.createPersonalAccessToken": "Persoonlijk toegangstoken maken",
    "userSettings.createPersonalAccessTokenDescription":
      "Kies alleen de benodigde toegang. Een betaald abonnement is vereist.",
    "userSettings.apiKeyCreateFailed": "Token kon niet worden gemaakt",
    "userSettings.apiKeyName": "Tokennaam",
    "userSettings.apiKeyNamePlaceholder": "bijv. Script voor maandrapportage",
    "userSettings.apiKeyNameDescription":
      "Gebruik een naam die aangeeft waar het token wordt gebruikt.",
    "userSettings.apiKeyScopes": "Machtigingen",
    "userSettings.apiKeyScopesDescription":
      "Begin met leestoegang en geef alleen meer als dat nodig is.",
    "userSettings.apiKeyReadScopeDescription": "Grootboekgegevens lezen.",
    "userSettings.apiKeyWriteScopeDescription":
      "Grootboekgegevens maken en bijwerken.",
    "userSettings.apiKeyAdminScopeDescription":
      "Administratieve grootboekacties uitvoeren.",
    "userSettings.apiKeyLedgerScope": "Grootboekbeperking (optioneel)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Beperk dit token met owner/ledger tot één grootboek.",
    "userSettings.apiKeyExpiration": "Vervaldatum (optioneel)",
    "userSettings.apiKeyExpirationDescription":
      "Het token blijft geldig tot het einde van deze UTC-datum.",
    "userSettings.apiKeyPaidFeature":
      "Persoonlijke toegangstokens zijn beschikbaar bij betaalde abonnementen. Bij een niet-geschikt abonnement wordt er geen gemaakt.",
    "userSettings.apiKeyCreating": "Maken…",
    "userSettings.apiKeyCreate": "Token maken",
    "userSettings.apiKeyCreated": "Token gemaakt",
    "userSettings.apiKeyCreatedDescription":
      "Je persoonlijke toegangstoken is klaar.",
    "userSettings.apiKeyCopyNow": "Kopieer dit token nu",
    "userSettings.apiKeySecretWarning":
      "Voor je veiligheid toont Beancount.io dit token niet opnieuw. Bewaar het in een geheimenbeheerder.",
    "userSettings.personalAccessToken": "Persoonlijk toegangstoken",
    "userSettings.apiKeyDone": "Klaar",
    "userSettings.apiKeyNameRequired": "Voer een tokennaam in.",
    "userSettings.apiKeyNameTooLong":
      "Tokennamen mogen maximaal 100 tekens bevatten.",
    "userSettings.apiKeyScopeRequired": "Selecteer ten minste één machtiging.",
    "userSettings.apiKeyLedgerScopeInvalid":
      "Gebruik de indeling owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Kies een toekomstige datum.",
    "userSettings.apiKeySecretMissing":
      "De server heeft geen token teruggegeven. Probeer opnieuw.",
    "userSettings.apiKeyActive": "Actief",
    "userSettings.apiKeyExpired": "Verlopen",
    "userSettings.apiKeyRevoked": "Ingetrokken",
    "userSettings.apiKeyLedger": "Grootboek",
    "userSettings.apiKeyAllLedgers": "Alle grootboeken",
    "userSettings.apiKeyCreatedAt": "Gemaakt",
    "userSettings.apiKeyLastUsed": "Laatst gebruikt",
    "userSettings.apiKeyExpiresAt": "Verloopt",
    "userSettings.apiKeyNoExpiration": "Geen vervaldatum",
    "userSettings.apiKeyRevoke": "Intrekken",
    "userSettings.apiKeyRevokeTitle": "Toegangstoken intrekken?",
    "userSettings.apiKeyRevokeDescription":
      "‘{name}’ direct intrekken? Clients die het gebruiken verliezen toegang.",
    "userSettings.apiKeyRevoking": "Intrekken…",
    "userSettings.apiKeyRevokedSuccess":
      "Persoonlijk toegangstoken ingetrokken",
  },
  pt: {
    "userSettings.apiKeys": "Tokens de acesso pessoal",
    "userSettings.apiKeysDescription":
      "Crie credenciais limitadas para scripts e integrações que usam a API do Beancount.io.",
    "userSettings.apiKeyNew": "Novo token",
    "userSettings.apiKeysLoading": "Carregando tokens de acesso…",
    "userSettings.apiKeysLoadFailed": "Não foi possível carregar os tokens",
    "userSettings.apiKeysLoadFailedDescription":
      "Não foi possível carregar seus tokens. Tente novamente.",
    "userSettings.apiKeysRetry": "Tentar novamente",
    "userSettings.apiKeysEmpty": "Nenhum token de acesso pessoal",
    "userSettings.apiKeysEmptyDescription":
      "Crie um token quando um script ou integração precisar acessar a API.",
    "userSettings.createPersonalAccessToken": "Criar token de acesso pessoal",
    "userSettings.createPersonalAccessTokenDescription":
      "Escolha somente o acesso necessário. É preciso ter um plano pago.",
    "userSettings.apiKeyCreateFailed": "Não foi possível criar o token",
    "userSettings.apiKeyName": "Nome do token",
    "userSettings.apiKeyNamePlaceholder": "ex.: Script de relatório mensal",
    "userSettings.apiKeyNameDescription":
      "Use um nome que identifique onde o token será usado.",
    "userSettings.apiKeyScopes": "Permissões",
    "userSettings.apiKeyScopesDescription":
      "Comece com acesso de leitura e conceda mais somente quando necessário.",
    "userSettings.apiKeyReadScopeDescription": "Ler dados do livro-razão.",
    "userSettings.apiKeyWriteScopeDescription":
      "Criar e atualizar dados do livro-razão.",
    "userSettings.apiKeyAdminScopeDescription":
      "Realizar operações administrativas no livro-razão.",
    "userSettings.apiKeyLedgerScope": "Restrição de livro-razão (opcional)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Restrinja o token a um livro-razão usando owner/ledger.",
    "userSettings.apiKeyExpiration": "Data de expiração (opcional)",
    "userSettings.apiKeyExpirationDescription":
      "O token é válido até o fim desta data UTC.",
    "userSettings.apiKeyPaidFeature":
      "Tokens pessoais estão disponíveis em planos pagos. Se o plano não for elegível, o token não será criado.",
    "userSettings.apiKeyCreating": "Criando…",
    "userSettings.apiKeyCreate": "Criar token",
    "userSettings.apiKeyCreated": "Token criado",
    "userSettings.apiKeyCreatedDescription":
      "Seu token de acesso pessoal está pronto.",
    "userSettings.apiKeyCopyNow": "Copie este token agora",
    "userSettings.apiKeySecretWarning":
      "Para sua segurança, o Beancount.io não o mostrará novamente. Guarde-o em um gerenciador de segredos.",
    "userSettings.personalAccessToken": "Token de acesso pessoal",
    "userSettings.apiKeyDone": "Concluído",
    "userSettings.apiKeyNameRequired": "Digite um nome para o token.",
    "userSettings.apiKeyNameTooLong":
      "O nome deve ter no máximo 100 caracteres.",
    "userSettings.apiKeyScopeRequired": "Selecione ao menos uma permissão.",
    "userSettings.apiKeyLedgerScopeInvalid": "Use o formato owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Escolha uma data futura.",
    "userSettings.apiKeySecretMissing":
      "O servidor não retornou o token. Tente novamente.",
    "userSettings.apiKeyActive": "Ativo",
    "userSettings.apiKeyExpired": "Expirado",
    "userSettings.apiKeyRevoked": "Revogado",
    "userSettings.apiKeyLedger": "Livro-razão",
    "userSettings.apiKeyAllLedgers": "Todos os livros-razão",
    "userSettings.apiKeyCreatedAt": "Criado",
    "userSettings.apiKeyLastUsed": "Último uso",
    "userSettings.apiKeyExpiresAt": "Expira",
    "userSettings.apiKeyNoExpiration": "Sem expiração",
    "userSettings.apiKeyRevoke": "Revogar",
    "userSettings.apiKeyRevokeTitle": "Revogar token de acesso?",
    "userSettings.apiKeyRevokeDescription":
      "Revogar “{name}” imediatamente? Os clientes perderão o acesso.",
    "userSettings.apiKeyRevoking": "Revogando…",
    "userSettings.apiKeyRevokedSuccess": "Token de acesso pessoal revogado",
  },
  ru: {
    "userSettings.apiKeys": "Персональные токены доступа",
    "userSettings.apiKeysDescription":
      "Создавайте ограниченные учётные данные для скриптов и интеграций с API Beancount.io.",
    "userSettings.apiKeyNew": "Новый токен",
    "userSettings.apiKeysLoading": "Загрузка токенов…",
    "userSettings.apiKeysLoadFailed": "Не удалось загрузить токены",
    "userSettings.apiKeysLoadFailedDescription":
      "Не удалось загрузить ваши токены. Повторите попытку.",
    "userSettings.apiKeysRetry": "Повторить",
    "userSettings.apiKeysEmpty": "Нет персональных токенов",
    "userSettings.apiKeysEmptyDescription":
      "Создайте токен, когда скрипту или интеграции потребуется доступ к API.",
    "userSettings.createPersonalAccessToken": "Создать персональный токен",
    "userSettings.createPersonalAccessTokenDescription":
      "Выберите только необходимый доступ. Требуется платный тариф.",
    "userSettings.apiKeyCreateFailed": "Не удалось создать токен",
    "userSettings.apiKeyName": "Название токена",
    "userSettings.apiKeyNamePlaceholder":
      "например, Скрипт ежемесячных отчётов",
    "userSettings.apiKeyNameDescription":
      "Укажите название, по которому понятно место использования токена.",
    "userSettings.apiKeyScopes": "Разрешения",
    "userSettings.apiKeyScopesDescription":
      "Начните с чтения и добавляйте доступ только при необходимости.",
    "userSettings.apiKeyReadScopeDescription": "Чтение данных книги.",
    "userSettings.apiKeyWriteScopeDescription":
      "Создание и изменение данных книги.",
    "userSettings.apiKeyAdminScopeDescription":
      "Административные операции с книгой.",
    "userSettings.apiKeyLedgerScope": "Ограничение книги (необязательно)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Ограничьте токен одной книгой в формате owner/ledger.",
    "userSettings.apiKeyExpiration": "Дата истечения (необязательно)",
    "userSettings.apiKeyExpirationDescription":
      "Токен действует до конца этой даты по UTC.",
    "userSettings.apiKeyPaidFeature":
      "Персональные токены доступны на платных тарифах. Если тариф не подходит, токен не будет создан.",
    "userSettings.apiKeyCreating": "Создание…",
    "userSettings.apiKeyCreate": "Создать токен",
    "userSettings.apiKeyCreated": "Токен создан",
    "userSettings.apiKeyCreatedDescription": "Ваш персональный токен готов.",
    "userSettings.apiKeyCopyNow": "Скопируйте токен сейчас",
    "userSettings.apiKeySecretWarning":
      "Для безопасности Beancount.io не покажет токен повторно. Сохраните его в менеджере секретов.",
    "userSettings.personalAccessToken": "Персональный токен доступа",
    "userSettings.apiKeyDone": "Готово",
    "userSettings.apiKeyNameRequired": "Введите название токена.",
    "userSettings.apiKeyNameTooLong":
      "Название должно содержать не более 100 символов.",
    "userSettings.apiKeyScopeRequired": "Выберите хотя бы одно разрешение.",
    "userSettings.apiKeyLedgerScopeInvalid": "Используйте формат owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Выберите будущую дату.",
    "userSettings.apiKeySecretMissing":
      "Сервер не вернул новый токен. Повторите попытку.",
    "userSettings.apiKeyActive": "Активен",
    "userSettings.apiKeyExpired": "Истёк",
    "userSettings.apiKeyRevoked": "Отозван",
    "userSettings.apiKeyLedger": "Книга",
    "userSettings.apiKeyAllLedgers": "Все книги",
    "userSettings.apiKeyCreatedAt": "Создан",
    "userSettings.apiKeyLastUsed": "Последнее использование",
    "userSettings.apiKeyExpiresAt": "Истекает",
    "userSettings.apiKeyNoExpiration": "Без срока",
    "userSettings.apiKeyRevoke": "Отозвать",
    "userSettings.apiKeyRevokeTitle": "Отозвать токен доступа?",
    "userSettings.apiKeyRevokeDescription":
      "Немедленно отозвать «{name}»? Использующие его клиенты потеряют доступ.",
    "userSettings.apiKeyRevoking": "Отзыв…",
    "userSettings.apiKeyRevokedSuccess": "Персональный токен отозван",
  },
  sk: {
    "userSettings.apiKeys": "Osobné prístupové tokeny",
    "userSettings.apiKeysDescription":
      "Vytvorte obmedzené poverenia pre skripty a integrácie používajúce API Beancount.io.",
    "userSettings.apiKeyNew": "Nový token",
    "userSettings.apiKeysLoading": "Načítavajú sa prístupové tokeny…",
    "userSettings.apiKeysLoadFailed": "Tokeny sa nepodarilo načítať",
    "userSettings.apiKeysLoadFailedDescription":
      "Vaše tokeny sa nepodarilo načítať. Skúste to znova.",
    "userSettings.apiKeysRetry": "Skúsiť znova",
    "userSettings.apiKeysEmpty": "Žiadne osobné prístupové tokeny",
    "userSettings.apiKeysEmptyDescription":
      "Vytvorte token, keď skript alebo integrácia potrebuje prístup k API.",
    "userSettings.createPersonalAccessToken":
      "Vytvoriť osobný prístupový token",
    "userSettings.createPersonalAccessTokenDescription":
      "Vyberte len potrebný prístup. Vyžaduje sa platený program.",
    "userSettings.apiKeyCreateFailed": "Token sa nepodarilo vytvoriť",
    "userSettings.apiKeyName": "Názov tokenu",
    "userSettings.apiKeyNamePlaceholder": "napr. Skript mesačných výkazov",
    "userSettings.apiKeyNameDescription":
      "Použite názov, ktorý označuje miesto použitia tokenu.",
    "userSettings.apiKeyScopes": "Oprávnenia",
    "userSettings.apiKeyScopesDescription":
      "Začnite čítaním a ďalší prístup udeľte iba podľa potreby.",
    "userSettings.apiKeyReadScopeDescription": "Čítať údaje účtovnej knihy.",
    "userSettings.apiKeyWriteScopeDescription":
      "Vytvárať a upravovať údaje účtovnej knihy.",
    "userSettings.apiKeyAdminScopeDescription":
      "Vykonávať administratívne operácie knihy.",
    "userSettings.apiKeyLedgerScope": "Obmedzenie knihy (voliteľné)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Obmedzte token na jednu knihu pomocou owner/ledger.",
    "userSettings.apiKeyExpiration": "Dátum vypršania (voliteľné)",
    "userSettings.apiKeyExpirationDescription":
      "Token platí do konca tohto dátumu UTC.",
    "userSettings.apiKeyPaidFeature":
      "Osobné tokeny sú dostupné v platených programoch. Pri nevhodnom programe sa token nevytvorí.",
    "userSettings.apiKeyCreating": "Vytvára sa…",
    "userSettings.apiKeyCreate": "Vytvoriť token",
    "userSettings.apiKeyCreated": "Token vytvorený",
    "userSettings.apiKeyCreatedDescription":
      "Váš osobný prístupový token je pripravený.",
    "userSettings.apiKeyCopyNow": "Skopírujte token teraz",
    "userSettings.apiKeySecretWarning":
      "Z bezpečnostných dôvodov ho Beancount.io už nezobrazí. Uložte ho v správcovi tajomstiev.",
    "userSettings.personalAccessToken": "Osobný prístupový token",
    "userSettings.apiKeyDone": "Hotovo",
    "userSettings.apiKeyNameRequired": "Zadajte názov tokenu.",
    "userSettings.apiKeyNameTooLong": "Názov môže mať najviac 100 znakov.",
    "userSettings.apiKeyScopeRequired": "Vyberte aspoň jedno oprávnenie.",
    "userSettings.apiKeyLedgerScopeInvalid": "Použite formát owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Vyberte budúci dátum.",
    "userSettings.apiKeySecretMissing":
      "Server nevrátil nový token. Skúste to znova.",
    "userSettings.apiKeyActive": "Aktívny",
    "userSettings.apiKeyExpired": "Vypršaný",
    "userSettings.apiKeyRevoked": "Odvolaný",
    "userSettings.apiKeyLedger": "Kniha",
    "userSettings.apiKeyAllLedgers": "Všetky knihy",
    "userSettings.apiKeyCreatedAt": "Vytvorený",
    "userSettings.apiKeyLastUsed": "Naposledy použitý",
    "userSettings.apiKeyExpiresAt": "Vyprší",
    "userSettings.apiKeyNoExpiration": "Bez vypršania",
    "userSettings.apiKeyRevoke": "Odvolať",
    "userSettings.apiKeyRevokeTitle": "Odvolať prístupový token?",
    "userSettings.apiKeyRevokeDescription":
      "Odvolať „{name}“ okamžite? Klienti stratia prístup.",
    "userSettings.apiKeyRevoking": "Odvoláva sa…",
    "userSettings.apiKeyRevokedSuccess": "Osobný prístupový token odvolaný",
  },
  uk: {
    "userSettings.apiKeys": "Персональні токени доступу",
    "userSettings.apiKeysDescription":
      "Створюйте обмежені облікові дані для скриптів та інтеграцій з API Beancount.io.",
    "userSettings.apiKeyNew": "Новий токен",
    "userSettings.apiKeysLoading": "Завантаження токенів…",
    "userSettings.apiKeysLoadFailed": "Не вдалося завантажити токени",
    "userSettings.apiKeysLoadFailedDescription":
      "Не вдалося завантажити ваші токени. Спробуйте ще раз.",
    "userSettings.apiKeysRetry": "Спробувати ще раз",
    "userSettings.apiKeysEmpty": "Немає персональних токенів",
    "userSettings.apiKeysEmptyDescription":
      "Створіть токен, коли скрипту чи інтеграції потрібен доступ до API.",
    "userSettings.createPersonalAccessToken": "Створити персональний токен",
    "userSettings.createPersonalAccessTokenDescription":
      "Виберіть лише потрібний доступ. Потрібен платний план.",
    "userSettings.apiKeyCreateFailed": "Не вдалося створити токен",
    "userSettings.apiKeyName": "Назва токена",
    "userSettings.apiKeyNamePlaceholder": "наприклад, Скрипт щомісячних звітів",
    "userSettings.apiKeyNameDescription":
      "Використайте назву, що вказує місце застосування токена.",
    "userSettings.apiKeyScopes": "Дозволи",
    "userSettings.apiKeyScopesDescription":
      "Почніть із читання й надавайте більше доступу лише за потреби.",
    "userSettings.apiKeyReadScopeDescription": "Читати дані книги.",
    "userSettings.apiKeyWriteScopeDescription":
      "Створювати й оновлювати дані книги.",
    "userSettings.apiKeyAdminScopeDescription":
      "Виконувати адміністративні операції книги.",
    "userSettings.apiKeyLedgerScope": "Обмеження книги (необов’язково)",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "Обмежте токен однією книгою у форматі owner/ledger.",
    "userSettings.apiKeyExpiration": "Дата завершення (необов’язково)",
    "userSettings.apiKeyExpirationDescription":
      "Токен діє до кінця цієї дати UTC.",
    "userSettings.apiKeyPaidFeature":
      "Персональні токени доступні в платних планах. Якщо план не підходить, токен не буде створено.",
    "userSettings.apiKeyCreating": "Створення…",
    "userSettings.apiKeyCreate": "Створити токен",
    "userSettings.apiKeyCreated": "Токен створено",
    "userSettings.apiKeyCreatedDescription": "Ваш персональний токен готовий.",
    "userSettings.apiKeyCopyNow": "Скопіюйте токен зараз",
    "userSettings.apiKeySecretWarning":
      "З міркувань безпеки Beancount.io більше не покаже цей токен. Збережіть його в менеджері секретів.",
    "userSettings.personalAccessToken": "Персональний токен доступу",
    "userSettings.apiKeyDone": "Готово",
    "userSettings.apiKeyNameRequired": "Введіть назву токена.",
    "userSettings.apiKeyNameTooLong":
      "Назва має містити не більше 100 символів.",
    "userSettings.apiKeyScopeRequired": "Виберіть принаймні один дозвіл.",
    "userSettings.apiKeyLedgerScopeInvalid":
      "Використовуйте формат owner/ledger.",
    "userSettings.apiKeyExpirationFuture": "Виберіть майбутню дату.",
    "userSettings.apiKeySecretMissing":
      "Сервер не повернув новий токен. Спробуйте ще раз.",
    "userSettings.apiKeyActive": "Активний",
    "userSettings.apiKeyExpired": "Термін минув",
    "userSettings.apiKeyRevoked": "Відкликаний",
    "userSettings.apiKeyLedger": "Книга",
    "userSettings.apiKeyAllLedgers": "Усі книги",
    "userSettings.apiKeyCreatedAt": "Створено",
    "userSettings.apiKeyLastUsed": "Останнє використання",
    "userSettings.apiKeyExpiresAt": "Завершується",
    "userSettings.apiKeyNoExpiration": "Без завершення",
    "userSettings.apiKeyRevoke": "Відкликати",
    "userSettings.apiKeyRevokeTitle": "Відкликати токен доступу?",
    "userSettings.apiKeyRevokeDescription":
      "Негайно відкликати «{name}»? Клієнти втратять доступ.",
    "userSettings.apiKeyRevoking": "Відкликання…",
    "userSettings.apiKeyRevokedSuccess": "Персональний токен відкликано",
  },
  zh: {
    "userSettings.apiKeys": "个人访问令牌",
    "userSettings.apiKeysDescription":
      "为使用 Beancount.io API 的脚本和集成创建权限受限的凭证。",
    "userSettings.apiKeyNew": "新建令牌",
    "userSettings.apiKeysLoading": "正在加载个人访问令牌…",
    "userSettings.apiKeysLoadFailed": "无法加载个人访问令牌",
    "userSettings.apiKeysLoadFailedDescription": "无法加载你的令牌，请重试。",
    "userSettings.apiKeysRetry": "重试",
    "userSettings.apiKeysEmpty": "暂无个人访问令牌",
    "userSettings.apiKeysEmptyDescription":
      "当脚本或集成需要访问 API 时创建令牌。",
    "userSettings.createPersonalAccessToken": "创建个人访问令牌",
    "userSettings.createPersonalAccessTokenDescription":
      "仅选择所需权限。创建令牌需要付费方案。",
    "userSettings.apiKeyCreateFailed": "无法创建令牌",
    "userSettings.apiKeyName": "令牌名称",
    "userSettings.apiKeyNamePlaceholder": "例如：月度报告脚本",
    "userSettings.apiKeyNameDescription": "使用能够说明令牌用途的名称。",
    "userSettings.apiKeyScopes": "权限",
    "userSettings.apiKeyScopesDescription":
      "从读取权限开始，仅在需要时授予更多权限。",
    "userSettings.apiKeyReadScopeDescription": "读取账本数据。",
    "userSettings.apiKeyWriteScopeDescription": "创建和更新账本数据。",
    "userSettings.apiKeyAdminScopeDescription": "执行账本管理操作。",
    "userSettings.apiKeyLedgerScope": "账本限制（可选）",
    "userSettings.apiKeyLedgerScopePlaceholder": "owner/ledger",
    "userSettings.apiKeyLedgerScopeDescription":
      "使用 owner/ledger 将令牌限制到一个账本。",
    "userSettings.apiKeyExpiration": "到期日期（可选）",
    "userSettings.apiKeyExpirationDescription": "令牌有效至该 UTC 日期结束。",
    "userSettings.apiKeyPaidFeature":
      "个人访问令牌仅适用于付费方案。如果当前方案不符合条件，将无法创建。",
    "userSettings.apiKeyCreating": "正在创建…",
    "userSettings.apiKeyCreate": "创建令牌",
    "userSettings.apiKeyCreated": "令牌已创建",
    "userSettings.apiKeyCreatedDescription": "你的个人访问令牌已就绪。",
    "userSettings.apiKeyCopyNow": "立即复制此令牌",
    "userSettings.apiKeySecretWarning":
      "为确保安全，Beancount.io 不会再次显示此令牌。请将其保存在密钥管理器中。",
    "userSettings.personalAccessToken": "个人访问令牌",
    "userSettings.apiKeyDone": "完成",
    "userSettings.apiKeyNameRequired": "请输入令牌名称。",
    "userSettings.apiKeyNameTooLong": "令牌名称不得超过 100 个字符。",
    "userSettings.apiKeyScopeRequired": "请至少选择一项权限。",
    "userSettings.apiKeyLedgerScopeInvalid": "请使用 owner/ledger 格式。",
    "userSettings.apiKeyExpirationFuture": "请选择未来的日期。",
    "userSettings.apiKeySecretMissing": "服务器未返回新令牌，请重试。",
    "userSettings.apiKeyActive": "有效",
    "userSettings.apiKeyExpired": "已过期",
    "userSettings.apiKeyRevoked": "已撤销",
    "userSettings.apiKeyLedger": "账本",
    "userSettings.apiKeyAllLedgers": "所有账本",
    "userSettings.apiKeyCreatedAt": "创建时间",
    "userSettings.apiKeyLastUsed": "上次使用",
    "userSettings.apiKeyExpiresAt": "到期时间",
    "userSettings.apiKeyNoExpiration": "永不过期",
    "userSettings.apiKeyRevoke": "撤销",
    "userSettings.apiKeyRevokeTitle": "撤销个人访问令牌？",
    "userSettings.apiKeyRevokeDescription":
      "立即撤销“{name}”？使用它的客户端将失去访问权限。",
    "userSettings.apiKeyRevoking": "正在撤销…",
    "userSettings.apiKeyRevokedSuccess": "个人访问令牌已撤销",
  },
};

function toEntries(messages: ApiKeyMessages): Record<string, TranslationEntry> {
  return Object.fromEntries(
    Object.entries(messages).map(([key, message]) => [
      key,
      { message, description: key },
    ]),
  );
}

export const apiKeyTranslations = Object.fromEntries(
  Object.entries(translations).map(([language, messages]) => [
    language,
    toEntries(messages),
  ]),
) as Record<SupportedLanguage, Record<string, TranslationEntry>>;
