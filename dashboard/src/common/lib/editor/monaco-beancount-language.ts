/**
 * @deprecated Import from `./monaco-beancount-language-vscode` instead.
 *
 * This module used to define its own Beancount grammar and register it under
 * the same global Monaco language id (`"beancount"`) as
 * `monaco-beancount-language-vscode`. Each module's `isRegistered` guard is
 * module-local, so mounting the create-file editor and any other beancount
 * editor in one session installed the tokenizer twice and the last editor to
 * mount re-highlighted every open beancount model with a different grammar.
 * The `-vscode` module is the canonical grammar (see `beancount-syntax.ts`,
 * which documents mirroring it), so this module is now a plain alias: one
 * grammar, one registration, one set of themes.
 */
export {
  beancountLanguageConfig,
  beancountTokenProvider,
  registerBeancountLanguage,
} from "./monaco-beancount-language-vscode";
