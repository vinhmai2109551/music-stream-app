# Licensed audio for background playback

Commercial songs play only through the official YouTube embed, and YouTube cannot play with the screen off. These eight tracks are the exception: music published under a **Creative Commons Attribution (CC BY)** licence, which allows hosting and playing it as long as the author is credited. They sit in the playlist **Phát nền – Background** (`background-play`), have an audio file in R2 and no YouTube video, so the app plays them with `expo-audio` (background playback and lock screen controls) and marks them with a headphones badge.

**No audio was downloaded or committed.** This file only records where each track comes from and which files you have to upload.

## How the licences were checked (05/11/2026)

- The licence of every track below is the one **stated on that recording's own Wikimedia Commons file page** (page opened and read; the links are in the table). Two other candidates were left out because their Commons page says the licence "has not yet been reviewed".
- The incompetech FAQ (<https://incompetech.com/music/royalty-free/faq.html>) gives the credit text with **CC BY 4.0**, but does not say which version covers each older recording. Several 2005–2009 recordings are shown on Commons as **CC BY 3.0**, so each track is credited with the version of its own page.
- I did **not** read the licence line of every track on incompetech.com (its catalog pages are built by a script and cannot be read without a browser). **Before you upload a file, look the title up on <https://incompetech.com/music/royalty-free/> and check that the licence shown there is still CC BY.** If it shows anything else, do not upload that file (the track then plays nothing and the app skips it).

## The tracks

| #   | Title                  | Author        | Licence (as stated on the Commons page) | Length (Commons) | Commons file page                                                                                                                                                           | MP3 download (answers on 05/11/2026)                                                          |
| --- | ---------------------- | ------------- | --------------------------------------- | ---------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Stratosphere           | Kevin MacLeod | CC BY 3.0 US                            |             1:02 | [File:Stratosphere, (MacLeod, Kevin).oga](<https://commons.wikimedia.org/wiki/File:Stratosphere,_(MacLeod,_Kevin).oga>)                                                     | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Stratosphere.mp3>                 |
| 2   | Ghost Dance            | Kevin MacLeod | CC BY 3.0 US                            |             1:13 | [File:Ghost Dance (MacLeod, Kevin) (ISRC USUAN1100573).oga](<https://commons.wikimedia.org/wiki/File:Ghost_Dance_(MacLeod,_Kevin)_(ISRC_USUAN1100573).oga>)                 | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Ghost%20Dance.mp3>                |
| 3   | Strength of the Titans | Kevin MacLeod | CC BY 4.0                               |             1:02 | [File:Strength Of The Titans by Kevin MacLeod.ogg](https://commons.wikimedia.org/wiki/File:Strength_Of_The_Titans_by_Kevin_MacLeod.ogg)                                     | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Strength%20of%20the%20Titans.mp3> |
| 4   | Sugar Plum Dark Mix    | Kevin MacLeod | CC BY 3.0 US                            |             2:05 | [File:Sugar Plum Dark Mix (Kevin MacLeod) (ISRC USUAN1100623).oga](<https://commons.wikimedia.org/wiki/File:Sugar_Plum_Dark_Mix_(Kevin_MacLeod)_(ISRC_USUAN1100623).oga>)   | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sugar%20Plum%20Dark%20Mix.mp3>    |
| 5   | Fork and Spoon         | Kevin MacLeod | CC BY 3.0 US                            |             3:16 | [File:Fork and Spoon (MacLeod, Kevin) (ISRC USUAN1100226).oga](<https://commons.wikimedia.org/wiki/File:Fork_and_Spoon_(MacLeod,_Kevin)_(ISRC_USUAN1100226).oga>)           | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fork%20and%20Spoon.mp3>           |
| 6   | Tea Roots              | Kevin MacLeod | CC BY 3.0 US                            |             4:40 | [File:Tea Roots (MacLeod, Kevin) (ISRC USUAN1100472).oga](<https://commons.wikimedia.org/wiki/File:Tea_Roots_(MacLeod,_Kevin)_(ISRC_USUAN1100472).oga>)                     | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Tea%20Roots.mp3>                  |
| 7   | Dream Catcher          | Kevin MacLeod | CC BY 3.0 (Unported)                    |             6:17 | [File:Kevin MacLeod - Dream Catcher (cc-by) (incompetech).ogg](<https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Dream_Catcher_(cc-by)_(incompetech).ogg>)           | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dream%20Catcher.mp3>              |
| 8   | Severe Tire Damage     | Kevin MacLeod | CC BY 4.0                               |             6:52 | [File:Kevin MacLeod - Severe Tire Damage (cc-by) (incompetech).ogg](<https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Severe_Tire_Damage_(cc-by)_(incompetech).ogg>) | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Severe%20Tire%20Damage.mp3>       |

Notes:

- The MP3 addresses in the last column were checked on 05/11/2026 with a HEAD request (all eight answered `200`; no file was downloaded). The older addresses written on the Commons pages (`music.incompetech.com/...`) now answer 404 and the `filmmusic.io` addresses lead to another site (`ende.app`), so do not use them. If an address stops working, search the title on <https://incompetech.com/music/royalty-free/>.
- **Sugar Plum Dark Mix** is a dark arrangement of Tchaikovsky's "Dance of the Sugar Plum Fairy" (the composition is public domain); the licence covers MacLeod's arrangement and recording.
- The Commons page of **Dream Catcher** carries a stray attribution line ("Killing Time"); credit it as "Dream Catcher".
- Commons stores these as OGG / OGA. **Upload MP3**: iOS cannot play Ogg Vorbis.
- Lengths are those of the Commons recordings. The MP3 you download can differ a little; `durationSec` in `catalog/background.ts` is only approximate (the player reads the real length once the file loads).

## Credit lines

CC BY requires crediting the author. The playlist description in the app carries a short credit; the full lines below belong in your project report / store listing:

```text
"<Title>" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution <version>
https://creativecommons.org/licenses/by/<version>/
```

Use `3.0` for tracks 1, 2, 4, 5, 6 and 7 and `4.0` for tracks 3 and 8 (see the table). Link for 3.0: <https://creativecommons.org/licenses/by/3.0/>; for 4.0: <https://creativecommons.org/licenses/by/4.0/>.

## Files to upload to R2

The seed stores each link as `${R2_PUBLIC_URL}/<path>`, so names and folders must match exactly.

Audio (MP3 you download from the sources above, renamed):

```text
audio/kevin-macleod-stratosphere.mp3
audio/kevin-macleod-ghost-dance.mp3
audio/kevin-macleod-strength-of-the-titans.mp3
audio/kevin-macleod-sugar-plum-dark-mix.mp3
audio/kevin-macleod-fork-and-spoon.mp3
audio/kevin-macleod-tea-roots.mp3
audio/kevin-macleod-dream-catcher.mp3
audio/kevin-macleod-severe-tire-damage.mp3
```

Pictures (optional: without them the app shows a coloured tile with initials):

```text
artists/kevin-macleod.jpg
covers/playlists/background-play.jpg
covers/background/kevin-macleod-stratosphere.jpg
covers/background/kevin-macleod-ghost-dance.jpg
covers/background/kevin-macleod-strength-of-the-titans.jpg
covers/background/kevin-macleod-sugar-plum-dark-mix.jpg
covers/background/kevin-macleod-fork-and-spoon.jpg
covers/background/kevin-macleod-tea-roots.jpg
covers/background/kevin-macleod-dream-catcher.jpg
covers/background/kevin-macleod-severe-tire-damage.jpg
```

Until the audio files exist, these tracks are listed but cannot be played: the app reports "Bài này chưa có nguồn phát" and moves on (it never plays a substitute).
