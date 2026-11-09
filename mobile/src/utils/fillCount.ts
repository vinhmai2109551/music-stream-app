/** Puts a number into a text from `copy` that has a `{n}` in it ("Còn {n} tin nhắn" → "Còn 5 tin nhắn"). */
export function fillCount(template: string, n: number): string {
  return template.replace("{n}", String(n))
}
