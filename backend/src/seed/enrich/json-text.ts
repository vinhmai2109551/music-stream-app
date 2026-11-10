/**
 * The JSON object inside a model's answer. A model asked for "JSON only" still sometimes wraps it
 * in a markdown fence or adds a sentence around it; this takes what lies between the first `{`
 * and the last `}`. Throws when there is nothing that looks like an object.
 */
export function extractJsonObject(text: string): string {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) throw new Error("The answer holds no JSON object")
  return text.slice(start, end + 1)
}
