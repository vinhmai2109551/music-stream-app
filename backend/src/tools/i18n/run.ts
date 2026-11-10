import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AppLanguage, TranslationService } from "../../modules/translation/index.js"
import { fillTemplate, flatten, setPath, type Json } from "./flatten.js"
import {
  expectedCharacters,
  planLanguage,
  type LanguagePlan,
  type LockEntries,
  type LockFile,
} from "./plan.js"
import { IGNORE_TAGS, fingerprint, restore, translationProblems } from "./placeholders.js"

export type Mode = "translate" | "dry-run" | "check"

export interface RunOptions {
  /** The folder of the app's translations (mobile/src/i18n). */
  dir: string
  mode: Mode
  /** The language the texts are written in (locales/<it>.json). */
  sourceLanguage: AppLanguage
  /** The languages to translate to. */
  languages: readonly AppLanguage[]
  /** Needed to translate; the other modes never call DeepL. */
  service?: Pick<TranslationService, "translate">
  log: (line: string) => void
}

export interface RunResult {
  /** False when something is missing (check), could not be translated or went wrong. */
  ok: boolean
  /** What DeepL billed, in characters. */
  billedCharacters: number
  translated: number
  /** Texts still without an up-to-date translation. */
  pending: number
}

const readJson = async <T>(file: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback
    throw new Error(`Could not read ${file}: ${(error as Error).message}`, { cause: error })
  }
}

const serialize = (tree: unknown): string => `${JSON.stringify(tree, null, 2)}\n`

/** Writes a file only when its content changes, so a second run leaves no trace. */
async function writeIfChanged(file: string, content: string): Promise<boolean> {
  const current = await readFile(file, "utf8").catch(() => null)
  if (current === content) return false
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content, "utf8")
  return true
}

/** The file of a language: the shape of the source filled with its texts, plus the plural forms. */
function buildLocale(source: Json, plan: LanguagePlan): Json {
  const tree = (fillTemplate(source, plan.texts) ?? {}) as Record<string, Json>
  const sourceKeys = new Set(Object.keys(flatten(source)))
  for (const [key, text] of Object.entries(plan.texts)) {
    if (!sourceKeys.has(key)) setPath(tree, key, text)
  }
  return tree
}

export async function runI18n(options: RunOptions): Promise<RunResult> {
  const { dir, mode, log, sourceLanguage } = options
  const localesDir = path.join(dir, "locales")
  const translateDir = path.join(dir, "translate")
  const lockFile = path.join(translateDir, "lock.json")

  const sourceTree = await readJson<Json>(path.join(localesDir, `${sourceLanguage}.json`), {})
  const source = flatten(sourceTree)
  const keepTerms = await readJson<string[]>(path.join(translateDir, "keep-list.json"), [])
  const lock = await readJson<LockFile>(lockFile, {
    version: 1,
    sourceLanguage,
    languages: {},
  })
  const targets = options.languages.filter((language) => language !== sourceLanguage)

  log(`Source: ${Object.keys(source).length} texts in ${sourceLanguage}.json`)
  const result: RunResult = { ok: true, billedCharacters: 0, translated: 0, pending: 0 }

  for (const language of targets) {
    const existing = flatten(await readJson<Json>(path.join(localesDir, `${language}.json`), {}))
    const overrides = flatten(
      await readJson<Json>(path.join(translateDir, "overrides", `${language}.json`), {}),
    )
    const plan = planLanguage({
      source,
      existing,
      lock: lock.languages[language] ?? {},
      overrides,
      keepTerms,
    })
    const todo = plan.toTranslate
    const overriddenSources = plan.overridden.filter((key) => key in source).length
    const kept = Object.keys(source).length - todo.length - overriddenSources
    log(
      `${language}: ${todo.length} to translate (~${expectedCharacters(todo)} characters), ` +
        `${kept} up to date, ${overriddenSources} overridden`,
    )
    for (const key of plan.unknownOverrides) {
      log(`  ${language}: override "${key}" matches no source text`)
      result.ok = false
    }

    if (mode !== "translate") {
      result.pending += todo.length
      if (mode === "check") {
        for (const item of todo)
          log(`  ${language}: ${item.stale ? "stale" : "missing"} ${item.key}`)
        if (todo.length > 0) result.ok = false
      }
      continue
    }

    if (todo.length > 0) {
      if (!options.service) throw new Error("A translation service is needed to translate")
      try {
        const answer = await options.service.translate(
          todo.map((item) => item.protectedText),
          language,
          { source: sourceLanguage, tagHandling: "xml", ignoreTags: [...IGNORE_TAGS] },
        )
        result.billedCharacters += answer.billedCharacters
        todo.forEach((item, index) => {
          const text = restore(answer.texts[index] ?? "")
          const problems = translationProblems(item.source, text, keepTerms)
          if (problems.length > 0) {
            result.pending += 1
            result.ok = false
            log(`  ${language}: ${item.key} not used - ${problems.join("; ")}`)
            if (item.stale && existing[item.key] !== undefined)
              plan.texts[item.key] = existing[item.key]
            return
          }
          plan.texts[item.key] = text
          plan.lock[item.key] = fingerprint(item.source, keepTerms)
          result.translated += 1
        })
      } catch (error) {
        result.ok = false
        result.pending += todo.length
        log(`  ${language}: stopped - ${(error as Error).message}`)
        break
      }
    }
    lock.languages[language] = plan.lock as LockEntries
    await writeIfChanged(
      path.join(localesDir, `${language}.json`),
      serialize(buildLocale(sourceTree, plan)),
    )
  }

  if (mode === "translate") await writeIfChanged(lockFile, serialize(sortLock(lock)))
  log(
    mode === "translate"
      ? `Done: ${result.translated} translated, ${result.billedCharacters} characters billed` +
          (result.pending > 0 ? `, ${result.pending} still to do` : "")
      : `${mode}: ${result.pending} texts without an up-to-date translation`,
  )
  return result
}

function sortLock(lock: LockFile): LockFile {
  const languages: Record<string, LockEntries> = {}
  for (const language of Object.keys(lock.languages).sort())
    languages[language] = lock.languages[language]
  return { ...lock, languages }
}
