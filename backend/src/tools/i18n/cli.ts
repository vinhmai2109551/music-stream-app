import "dotenv/config"
import { fileURLToPath } from "node:url"
import {
  TranslationService,
  createDeepLTranslator,
  APP_LANGUAGES,
  SOURCE_LANGUAGE,
  parseAppLanguage,
  type AppLanguage,
} from "../../modules/translation/index.js"
import { runI18n, type Mode } from "./run.js"

const USAGE = `Translates the texts of the mobile app (mobile/src/i18n/locales/vi.json) with DeepL.

  npm run i18n:translate                 translate the new and changed texts
  npm run i18n:translate -- --dry-run    show what would be translated and its size (no DeepL call)
  npm run i18n:translate -- --check      fail when a translation is missing or stale (no DeepL call)
  npm run i18n:translate -- --lang=ko,ja only these languages

The key is DEEPL_API_KEY in backend/.env; it is only needed to translate.`

function readArguments(argv: readonly string[]): { mode: Mode; languages?: AppLanguage[] } | null {
  if (argv.includes("--help")) return null
  const mode: Mode = argv.includes("--check")
    ? "check"
    : argv.includes("--dry-run")
      ? "dry-run"
      : "translate"
  const lang = argv.find((arg) => arg.startsWith("--lang="))?.slice("--lang=".length)
  if (lang === undefined) return { mode }
  const languages = lang.split(",").map((code) => parseAppLanguage(code))
  if (languages.some((language) => language === null))
    throw new Error(`Unknown language in --lang=${lang}`)
  return { mode, languages: languages as AppLanguage[] }
}

async function main() {
  const args = readArguments(process.argv.slice(2))
  if (!args) {
    console.log(USAGE)
    return
  }
  const dir = fileURLToPath(new URL("../../../../mobile/src/i18n", import.meta.url))

  let service: TranslationService | undefined
  if (args.mode === "translate") {
    const apiKey = process.env.DEEPL_API_KEY?.trim()
    if (!apiKey) {
      console.error(
        "No DeepL key: set DEEPL_API_KEY in backend/.env (never in mobile/) and run again.",
      )
      process.exitCode = 1
      return
    }
    const maxRetries = Number(process.env.DEEPL_MAX_RETRIES ?? 3)
    service = new TranslationService(createDeepLTranslator({ apiKey, maxRetries }))
  }

  const result = await runI18n({
    dir,
    mode: args.mode,
    sourceLanguage: SOURCE_LANGUAGE,
    languages: args.languages ?? APP_LANGUAGES,
    service,
    log: (line) => console.log(line),
  })
  if (!result.ok) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "i18n:translate failed")
  process.exitCode = 1
})
