import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { KnowledgeFile } from "./ports.js"

/**
 * Where the help texts are, unless `KNOWLEDGE_DIR` says otherwise. A relative path starts at the
 * folder the command runs in (`backend/`, where `npm run ai:embed` is run). The folder belongs to
 * the ai module; the specs read it, so moving it without this path breaks them.
 */
export const DEFAULT_KNOWLEDGE_DIR = path.join("src", "modules", "ai", "knowledge")

/** Reads every `.md` file of `dir` (a README there would be indexed too), in name order. */
export async function readKnowledgeFiles(dir: string): Promise<KnowledgeFile[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const names = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort()
  return Promise.all(
    names.map(async (name) => ({ name, text: await readFile(path.join(dir, name), "utf8") })),
  )
}
