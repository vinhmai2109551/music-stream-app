# R2 upload list

Every file the seed refers to, as a path relative to the bucket root. The seeder links each one as `${R2_PUBLIC_URL}/<path>`, so the file name and folder must match exactly (lowercase, no spaces).

- Images are `.jpg`. Track ids follow `<artistId>-<slug>`; a cover is named after the track id.
- Nothing is uploaded by the seed itself; until the files exist, the app shows empty covers.
- **Do not upload audio for the new catalog.** Those are commercial recordings: they play through the official YouTube embed. The seed still stores `audio/<trackId>.mp3` for each of them (the column is required), but those files do not exist and must stay out of the bucket.
- Only the original demo tracks (section below) are hosted on R2 as mp3. `durationSec` is approximate in the seed: update it to the real file length when you add real files.

## New catalog (Vietnam, Korea, Japan, China)

| Folder              |   Files | Type |
| ------------------- | ------: | ---- |
| `artists/`          |      47 | JPG  |
| `covers/vietnam/`   |      43 | JPG  |
| `covers/korea/`     |      43 | JPG  |
| `covers/japan/`     |      12 | JPG  |
| `covers/china/`     |       9 | JPG  |
| `covers/albums/`    |       6 | JPG  |
| `covers/playlists/` |       5 | JPG  |
| **Total**           | **165** |      |

### `artists/` (47)

```text
artists/son-tung.jpg
artists/soobin.jpg
artists/jack.jpg
artists/hngle.jpg
artists/hieuthuhai.jpg
artists/den.jpg
artists/mono.jpg
artists/mck.jpg
artists/tlinh.jpg
artists/hoa-minzy.jpg
artists/vu.jpg
artists/tang-duy-tan.jpg
artists/hoang-thuy-linh.jpg
artists/duc-phuc.jpg
artists/wren-evans.jpg
artists/bich-phuong.jpg
artists/my-tam.jpg
artists/bts.jpg
artists/jung-kook.jpg
artists/jimin.jpg
artists/blackpink.jpg
artists/rose.jpg
artists/jennie.jpg
artists/lisa.jpg
artists/newjeans.jpg
artists/aespa.jpg
artists/ive.jpg
artists/le-sserafim.jpg
artists/twice.jpg
artists/stray-kids.jpg
artists/seventeen.jpg
artists/iu.jpg
artists/bigbang.jpg
artists/g-dragon.jpg
artists/yoasobi.jpg
artists/kenshi-yonezu.jpg
artists/higedan.jpg
artists/ado.jpg
artists/fujii-kaze.jpg
artists/king-gnu.jpg
artists/creepy-nuts.jpg
artists/aimer.jpg
artists/jay-chou.jpg
artists/gem.jpg
artists/jj-lin.jpg
artists/mayday.jpg
artists/eason-chan.jpg
```

### `covers/vietnam/` (43)

```text
covers/vietnam/son-tung-chung-ta-cua-hien-tai.jpg
covers/vietnam/son-tung-hay-trao-cho-anh.jpg
covers/vietnam/son-tung-noi-nay-co-anh.jpg
covers/vietnam/son-tung-lac-troi.jpg
covers/vietnam/son-tung-muon-roi-ma-sao-con.jpg
covers/vietnam/son-tung-dung-lam-trai-tim-anh-dau.jpg
covers/vietnam/soobin-phia-sau-mot-co-gai.jpg
covers/vietnam/soobin-anh-da-quen-voi-co-don.jpg
covers/vietnam/soobin-gia-nhu.jpg
covers/vietnam/soobin-dancing-in-the-dark.jpg
covers/vietnam/jack-song-gio.jpg
covers/vietnam/jack-bac-phan.jpg
covers/vietnam/jack-hong-nhan.jpg
covers/vietnam/jack-hoa-hai-duong.jpg
covers/vietnam/jack-thien-ly-oi.jpg
covers/vietnam/hngle-khong-buong.jpg
covers/vietnam/hngle-tim-em.jpg
covers/vietnam/hieuthuhai-khong-the-say.jpg
covers/vietnam/hieuthuhai-ngu-mot-minh.jpg
covers/vietnam/hieuthuhai-exit-sign.jpg
covers/vietnam/den-mang-tien-ve-cho-me.jpg
covers/vietnam/den-di-ve-nha.jpg
covers/vietnam/den-bai-nay-chill-phet.jpg
covers/vietnam/mono-waiting-for-you.jpg
covers/vietnam/mono-em-la.jpg
covers/vietnam/mck-chim-sau.jpg
covers/vietnam/tlinh-neu-luc-do.jpg
covers/vietnam/tlinh-gai-doc-than.jpg
covers/vietnam/hoa-minzy-bac-bling.jpg
covers/vietnam/hoa-minzy-khong-the-cung-nhau-suot-kiep.jpg
covers/vietnam/vu-la-lung.jpg
covers/vietnam/vu-buoc-qua-nhau.jpg
covers/vietnam/tang-duy-tan-ben-tren-tang-lau.jpg
covers/vietnam/tang-duy-tan-da-vu.jpg
covers/vietnam/hoang-thuy-linh-de-mi-noi-cho-ma-nghe.jpg
covers/vietnam/hoang-thuy-linh-see-tinh.jpg
covers/vietnam/duc-phuc-hon-ca-yeu.jpg
covers/vietnam/duc-phuc-anh-nang-cua-anh.jpg
covers/vietnam/wren-evans-thich-em-hoi-nhieu.jpg
covers/vietnam/bich-phuong-bua-yeu.jpg
covers/vietnam/bich-phuong-di-du-dua-di.jpg
covers/vietnam/my-tam-dau-chi-rieng-em.jpg
covers/vietnam/my-tam-uoc-gi.jpg
```

### `covers/korea/` (43)

```text
covers/korea/bts-dynamite.jpg
covers/korea/bts-butter.jpg
covers/korea/bts-boy-with-luv.jpg
covers/korea/bts-spring-day.jpg
covers/korea/bts-dna.jpg
covers/korea/bts-permission-to-dance.jpg
covers/korea/jung-kook-seven.jpg
covers/korea/jung-kook-standing-next-to-you.jpg
covers/korea/jimin-like-crazy.jpg
covers/korea/blackpink-how-you-like-that.jpg
covers/korea/blackpink-ddu-du-ddu-du.jpg
covers/korea/blackpink-pink-venom.jpg
covers/korea/blackpink-shut-down.jpg
covers/korea/rose-apt.jpg
covers/korea/jennie-solo.jpg
covers/korea/jennie-like-jennie.jpg
covers/korea/lisa-money.jpg
covers/korea/lisa-rockstar.jpg
covers/korea/newjeans-hype-boy.jpg
covers/korea/newjeans-ditto.jpg
covers/korea/newjeans-omg.jpg
covers/korea/newjeans-super-shy.jpg
covers/korea/aespa-next-level.jpg
covers/korea/aespa-supernova.jpg
covers/korea/aespa-whiplash.jpg
covers/korea/ive-love-dive.jpg
covers/korea/ive-after-like.jpg
covers/korea/ive-i-am.jpg
covers/korea/le-sserafim-antifragile.jpg
covers/korea/le-sserafim-easy.jpg
covers/korea/twice-fancy.jpg
covers/korea/twice-what-is-love.jpg
covers/korea/stray-kids-gods-menu.jpg
covers/korea/stray-kids-maniac.jpg
covers/korea/stray-kids-s-class.jpg
covers/korea/seventeen-hot.jpg
covers/korea/seventeen-super.jpg
covers/korea/iu-blueming.jpg
covers/korea/iu-celebrity.jpg
covers/korea/iu-love-wins-all.jpg
covers/korea/bigbang-haru-haru.jpg
covers/korea/bigbang-bang-bang-bang.jpg
covers/korea/g-dragon-power.jpg
```

### `covers/japan/` (12)

```text
covers/japan/yoasobi-yoru-ni-kakeru.jpg
covers/japan/yoasobi-idol.jpg
covers/japan/kenshi-yonezu-lemon.jpg
covers/japan/kenshi-yonezu-kick-back.jpg
covers/japan/higedan-pretender.jpg
covers/japan/higedan-subtitle.jpg
covers/japan/ado-usseewa.jpg
covers/japan/ado-new-genesis.jpg
covers/japan/fujii-kaze-shinunoga-e-wa.jpg
covers/japan/king-gnu-specialz.jpg
covers/japan/creepy-nuts-bling-bang-bang-born.jpg
covers/japan/aimer-zankyosanka.jpg
```

### `covers/china/` (9)

```text
covers/china/jay-chou-love-confession.jpg
covers/china/jay-chou-sunny-day.jpg
covers/china/jay-chou-rice-field.jpg
covers/china/gem-light-years-away.jpg
covers/china/gem-bubble.jpg
covers/china/jj-lin-jiang-nan.jpg
covers/china/mayday-stubborn.jpg
covers/china/mayday-suddenly-miss-you-so-bad.jpg
covers/china/eason-chan-lonely-warrior.jpg
```

### `covers/albums/` (6)

```text
covers/albums/son-tung-hits.jpg
covers/albums/soobin-hits.jpg
covers/albums/jack-hits.jpg
covers/albums/bts-hits.jpg
covers/albums/blackpink-hits.jpg
covers/albums/newjeans-hits.jpg
```

### `covers/playlists/` (5)

```text
covers/playlists/top50-vietnam.jpg
covers/playlists/top-kpop.jpg
covers/playlists/top-jpop.jpg
covers/playlists/top-cpop.jpg
covers/playlists/asia-mix.jpg
```

## Original mock media (unchanged)

Already referenced by the first seed (Ryan Young, Jessica Gonzalez, ...), including the 7 demo mp3 files. Listed so one document covers the whole bucket. The artwork source files are in `mobile/assets/images`.

| Folder     |  Files |
| ---------- | -----: |
| `artists/` |     12 |
| `audio/`   |      7 |
| `banners/` |      2 |
| `covers/`  |     14 |
| **Total**  | **35** |

### `artists/` (12)

```text
artists/ryan-young.png
artists/jessica-gonzalez.png
artists/jennifer-wilson.png
artists/elizabeth-hall.png
artists/anthony-taylor.png
artists/brian-bailey.png
artists/pedro-moreno.png
artists/william-king.png
artists/avatar-sally-rooney.png
artists/avatar-jason-smith.png
artists/avatar-michael-key.png
artists/user-ashley-scott.png
```

### `audio/` (7)

```text
audio/flower.mp3
audio/shape.mp3
audio/blinding.mp3
audio/levitating.mp3
audio/astronaut.mp3
audio/dynamite.mp3
audio/me.mp3
```

### `banners/` (2)

```text
banners/post-flower.png
banners/post-me.png
```

### `covers/` (14)

```text
covers/track-flower.png
covers/track-shape-of-you.png
covers/track-blinding-lights.png
covers/track-levitating.png
covers/track-astronaut.png
covers/track-dynamite.png
covers/track-me.png
covers/album-me.png
covers/album-magna-nost.png
covers/album-proident.png
covers/playlist-top50-canada.png
covers/playlist-top50-global.png
covers/playlist-top50-trending.png
covers/playlist-favorites.png
```
