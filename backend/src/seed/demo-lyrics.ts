import type { PrismaClient } from "../generated/prisma/client.js"
import { lyricsContentHash } from "../modules/lyrics/index.js"

/** Marks lyrics that were written for the demo; the app shows them as such. */
export const DEMO_SOURCE = "demo"

export interface DemoLyrics {
  trackId: string
  language: "vi" | "ko" | "ja"
  lines: string[]
}

/**
 * DEMO TEXTS, written for this project. They are NOT the lyrics of the songs they are attached to
 * (those are protected): the first line says so. They exist so the lyrics screen and the translation
 * can be tried in three languages. Real lyrics come from an administrator or a licensed source.
 */
export const DEMO_LYRICS: DemoLyrics[] = [
  {
    trackId: "son-tung-lac-troi",
    language: "vi",
    lines: [
      "Đây là lời demo, tự viết cho ứng dụng",
      "Không phải lời gốc của bài hát này",
      "",
      "Nốt nhạc đầu tiên khẽ chạm vào đêm",
      "Giai điệu nhỏ đi qua mười con phố",
      "Ta ngồi lại nghe thành phố thở",
      "Và bản dịch sẽ hiện ra bên cạnh",
    ],
  },
  {
    trackId: "bts-dynamite",
    language: "ko",
    lines: [
      "이것은 앱을 위해 직접 쓴 데모 가사입니다",
      "원곡의 가사가 아닙니다",
      "",
      "첫 음이 조용히 밤에 닿아요",
      "작은 멜로디가 거리를 지나가요",
      "우리는 앉아서 도시의 숨소리를 들어요",
      "번역이 옆에 나란히 나타나요",
    ],
  },
  {
    trackId: "yoasobi-idol",
    language: "ja",
    lines: [
      "これはアプリのために書いたデモの歌詞です",
      "原曲の歌詞ではありません",
      "",
      "最初の音が静かに夜に触れる",
      "小さなメロディーが街を通り過ぎる",
      "私たちは座って街の息づかいを聞く",
      "翻訳がとなりに並んで現れる",
    ],
  },
]

/**
 * Adds the demo lyrics to the tracks that exist. Safe to run again: lyrics an administrator has
 * replaced with something else (another source) are left alone, and a translation made for the
 * demo text is kept as long as the text is the same.
 */
export async function seedDemoLyrics(prisma: PrismaClient): Promise<number> {
  let written = 0
  for (const demo of DEMO_LYRICS) {
    const track = await prisma.track.findUnique({
      where: { id: demo.trackId },
      select: { id: true },
    })
    if (!track) continue
    const kept = await prisma.trackLyrics.findUnique({ where: { trackId: demo.trackId } })
    if (kept && kept.source !== DEMO_SOURCE) continue

    const contentHash = lyricsContentHash(demo.language, demo.lines)
    const data = { language: demo.language, lines: demo.lines, source: DEMO_SOURCE, contentHash }
    const lyrics = await prisma.trackLyrics.upsert({
      where: { trackId: demo.trackId },
      create: { trackId: demo.trackId, ...data },
      update: data,
    })
    await prisma.trackLyricsTranslation.deleteMany({
      where: { lyricsId: lyrics.id, sourceHash: { not: contentHash } },
    })
    written += 1
  }
  return written
}
