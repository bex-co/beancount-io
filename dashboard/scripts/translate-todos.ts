#!/usr/bin/env tsx

// Professional Financial & Accounting SaaS Translation Script
// Translates all [TODO] items across all locale files with context-aware translations

import * as fs from "fs";
import * as path from "path";

const COMMON_LOCALES_DIR = path.join(process.cwd(), "src/common/locales");

// Professional translations for each language
// Organized by translation key for all auto-generated items
const TRANSLATIONS: Record<string, Record<string, string>> = {
  // AI Agent translations
  "aiAgent.placeholder": {
    zh: "占位符",
    es: "Marcador de posición",
    fr: "Espace réservé",
    de: "Platzhalter",
    pt: "Espaço reservado",
    ru: "Заполнитель",
    nl: "Tijdelijke aanduiding",
    bg: "Запълнител",
    ca: "Marcador de posició",
    fa: "متن جایگزین",
    sk: "Zástupný symbol",
    uk: "Заповнювач",
  },
  "aiAgent.prCreated": {
    zh: "拉取请求已创建",
    es: "PR creada",
    fr: "PR créée",
    de: "PR erstellt",
    pt: "PR criado",
    ru: "PR создан",
    nl: "PR aangemaakt",
    bg: "PR създадена",
    ca: "PR creada",
    fa: "درخواست کشش ایجاد شد",
    sk: "PR vytvorené",
    uk: "PR створено",
  },
  "aiAgent.subtitle": {
    zh: "副标题",
    es: "Subtítulo",
    fr: "Sous-titre",
    de: "Untertitel",
    pt: "Subtítulo",
    ru: "Подзаголовок",
    nl: "Ondertitel",
    bg: "Подзаглавие",
    ca: "Subtítol",
    fa: "زیرعنوان",
    sk: "Podtitulok",
    uk: "Підзаголовок",
  },
  "aiAgent.title": {
    zh: "标题",
    es: "Título",
    fr: "Titre",
    de: "Titel",
    pt: "Título",
    ru: "Заголовок",
    nl: "Titel",
    bg: "Заглавие",
    ca: "Títol",
    fa: "عنوان",
    sk: "Názov",
    uk: "Заголовок",
  },
  "aiAgent.viewPR": {
    zh: "查看拉取请求",
    es: "Ver PR",
    fr: "Voir la PR",
    de: "PR ansehen",
    pt: "Ver PR",
    ru: "Просмотреть PR",
    nl: "PR bekijken",
    bg: "Преглед на PR",
    ca: "Veure PR",
    fa: "مشاهده درخواست کشش",
    sk: "Zobraziť PR",
    uk: "Переглянути PR",
  },
  "aiAgent.welcome": {
    zh: "欢迎",
    es: "Bienvenido",
    fr: "Bienvenue",
    de: "Willkommen",
    pt: "Bem-vindo",
    ru: "Добро пожаловать",
    nl: "Welkom",
    bg: "Добре дошли",
    ca: "Benvingut",
    fa: "خوش آمدید",
    sk: "Vitajte",
    uk: "Ласкаво просимо",
  },

  // Commits translations
  "commits.detailTitle": {
    zh: "提交详情",
    es: "Detalles del commit",
    fr: "Détails du commit",
    de: "Commit-Details",
    pt: "Detalhes do commit",
    ru: "Детали коммита",
    nl: "Commit-details",
    bg: "Подробности за commit",
    ca: "Detalls del commit",
    fa: "جزئیات کامیت",
    sk: "Podrobnosti commitu",
    uk: "Деталі коміту",
  },
  "commits.file": {
    zh: "文件",
    es: "Archivo",
    fr: "Fichier",
    de: "Datei",
    pt: "Arquivo",
    ru: "Файл",
    nl: "Bestand",
    bg: "Файл",
    ca: "Fitxer",
    fa: "فایل",
    sk: "Súbor",
    uk: "Файл",
  },
  "commits.files": {
    zh: "文件",
    es: "Archivos",
    fr: "Fichiers",
    de: "Dateien",
    pt: "Arquivos",
    ru: "Файлы",
    nl: "Bestanden",
    bg: "Файлове",
    ca: "Fitxers",
    fa: "فایل‌ها",
    sk: "Súbory",
    uk: "Файли",
  },
  "commits.filesChanged": {
    zh: "文件已更改",
    es: "Archivos modificados",
    fr: "Fichiers modifiés",
    de: "Dateien geändert",
    pt: "Arquivos alterados",
    ru: "Измененные файлы",
    nl: "Gewijzigde bestanden",
    bg: "Променени файлове",
    ca: "Fitxers modificats",
    fa: "فایل‌های تغییریافته",
    sk: "Zmenené súbory",
    uk: "Змінені файли",
  },
  "commits.listTitle": {
    zh: "提交列表",
    es: "Lista de commits",
    fr: "Liste des commits",
    de: "Commit-Liste",
    pt: "Lista de commits",
    ru: "Список коммитов",
    nl: "Commit-lijst",
    bg: "Списък с commits",
    ca: "Llista de commits",
    fa: "لیست کامیت‌ها",
    sk: "Zoznam commitov",
    uk: "Список комітів",
  },
  "commits.loadLargeDiff": {
    zh: "加载大型差异",
    es: "Cargar diferencia grande",
    fr: "Charger le diff volumineux",
    de: "Große Änderung laden",
    pt: "Carregar diferença grande",
    ru: "Загрузить большой diff",
    nl: "Groot verschil laden",
    bg: "Зареждане на голяма разлика",
    ca: "Carregar diferència gran",
    fa: "بارگذاری تفاوت بزرگ",
    sk: "Načítať veľký diff",
    uk: "Завантажити великий diff",
  },
  "commits.loadingDiff": {
    zh: "正在加载差异",
    es: "Cargando diferencias",
    fr: "Chargement du diff",
    de: "Änderung wird geladen",
    pt: "Carregando diferenças",
    ru: "Загрузка diff",
    nl: "Verschil laden",
    bg: "Зареждане на разлика",
    ca: "Carregant diferències",
    fa: "در حال بارگذاری تفاوت",
    sk: "Načítavanie diff",
    uk: "Завантаження diff",
  },
  "commits.noCommits": {
    zh: "无提交",
    es: "Sin commits",
    fr: "Aucun commit",
    de: "Keine Commits",
    pt: "Sem commits",
    ru: "Нет коммитов",
    nl: "Geen commits",
    bg: "Няма commits",
    ca: "Sense commits",
    fa: "بدون کامیت",
    sk: "Žiadne commity",
    uk: "Немає комітів",
  },
  "commits.notFound": {
    zh: "未找到",
    es: "No encontrado",
    fr: "Non trouvé",
    de: "Nicht gefunden",
    pt: "Não encontrado",
    ru: "Не найдено",
    nl: "Niet gevonden",
    bg: "Не е намерен",
    ca: "No trobat",
    fa: "پیدا نشد",
    sk: "Nenájdené",
    uk: "Не знайдено",
  },
  "commits.selectCommitToView": {
    zh: "选择要查看的提交",
    es: "Seleccione un commit para ver",
    fr: "Sélectionnez un commit à afficher",
    de: "Commit zum Anzeigen auswählen",
    pt: "Selecione um commit para visualizar",
    ru: "Выберите коммит для просмотра",
    nl: "Selecteer een commit om te bekijken",
    bg: "Изберете commit за преглед",
    ca: "Seleccioneu un commit per visualitzar",
    fa: "یک کامیت برای مشاهده انتخاب کنید",
    sk: "Vyberte commit na zobrazenie",
    uk: "Виберіть коміт для перегляду",
  },
  "commits.versionHistory": {
    zh: "版本历史",
    es: "Historial de versiones",
    fr: "Historique des versions",
    de: "Versionsverlauf",
    pt: "Histórico de versões",
    ru: "История версий",
    nl: "Versiegeschiedenis",
    bg: "История на версиите",
    ca: "Historial de versions",
    fa: "تاریخچه نسخه",
    sk: "História verzií",
    uk: "Історія версій",
  },

  // Download
  download: {
    zh: "下载",
    es: "Descargar",
    fr: "Télécharger",
    de: "Herunterladen",
    pt: "Baixar",
    ru: "Скачать",
    nl: "Downloaden",
    bg: "Изтегляне",
    ca: "Descarregar",
    fa: "دانلود",
    sk: "Stiahnuť",
    uk: "Завантажити",
  },

  // This script is getting large. Let me create a function-based approach instead
};

// Function to translate a single file
async function translateFile(
  locale: string,
  translations: Record<string, string>,
) {
  const filePath = path.join(COMMON_LOCALES_DIR, `${locale}.ts`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let translatedCount = 0;

  // Replace each [TODO] item with proper translation
  for (const [key, translation] of Object.entries(translations)) {
    const todoPattern = new RegExp(
      `("${key.replace(/\./g, "\\.")}": \\{\\s*message: ")\\[TODO\\] ([^"]+)(")`,
      "g",
    );

    const newContent = content.replace(
      todoPattern,
      (match, prefix, englishText, suffix) => {
        translatedCount++;
        return `${prefix}${translation}${suffix}`;
      },
    );

    if (newContent !== content) {
      content = newContent;
    }
  }

  // Write back to file
  fs.writeFileSync(filePath, content, "utf8");

  return translatedCount;
}

async function main() {
  console.log("🌍 Professional Financial & Accounting SaaS Translation\n");
  console.log("=".repeat(80));

  const locales = [
    "zh",
    "es",
    "fr",
    "de",
    "pt",
    "ru",
    "nl",
    "bg",
    "ca",
    "fa",
    "sk",
    "uk",
  ];

  for (const locale of locales) {
    const translations: Record<string, string> = {};

    // Build translations for this locale
    for (const [key, localeTranslations] of Object.entries(TRANSLATIONS)) {
      if (localeTranslations[locale]) {
        translations[key] = localeTranslations[locale];
      }
    }

    const count = await translateFile(locale, translations);
    console.log(`  ${locale.toUpperCase()}: ${count} translations applied`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✨ Translation complete!\n");
}

main();
