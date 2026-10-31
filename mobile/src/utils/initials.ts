/** Letters of a name for a picture that has no photo: "Sơn Tùng M-TP" -> "ST", "BTS" -> "BT". */
export function initialsOf(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return ""
  if (words.length === 1) return [...words[0]].slice(0, 2).join("").toUpperCase()
  return ([...words[0]][0] + [...words[1]][0]).toUpperCase()
}

/** A small stable number for a text, so the same item always gets the same colours. */
export function hashOf(text: string): number {
  let hash = 2166136261
  for (const char of text) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619)
  }
  return hash >>> 0
}
