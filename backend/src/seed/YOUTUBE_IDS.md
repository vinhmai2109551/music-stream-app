# YouTube ids of the catalog

Checked on 31/10/2026. 107 of 107 catalog tracks have a verified video; the ids live in `catalog/youtube-ids.ts`.

How each id was checked (metadata only, nothing is downloaded):

1. `GET https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json` must answer 200. A 404 (gone) or 401/403 (embedding off) means the id is not used.
2. `title` must name the song.
3. `author_name` must be an official channel: the artist's own channel, its company or label (HYBE LABELS, SMTOWN, JYP Entertainment, ICM Entertainment, ...), or the auto-generated `<artist> - Topic` channel.

Fan re-uploads, reactions, covers and lyric videos of other channels were rejected (listed at the end). Where an artist has no official music video, an official lyric video or the Topic channel is used; a Topic video shows only a static cover.

| Track id                                  | Title                                 | Video id      | Channel                           | Status                                |
| ----------------------------------------- | ------------------------------------- | ------------- | --------------------------------- | ------------------------------------- |
| `son-tung-chung-ta-cua-hien-tai`          | Chúng Ta Của Hiện Tại                 | `bNp9pn0ni3I` | Sơn Tùng M-TP - Topic             | verified: Topic channel (audio)       |
| `son-tung-hay-trao-cho-anh`               | Hãy Trao Cho Anh                      | `knW7-x7Y7RE` | Sơn Tùng M-TP Official            | verified: official video              |
| `son-tung-noi-nay-co-anh`                 | Nơi Này Có Anh                        | `FN7ALfpGxiI` | Sơn Tùng M-TP Official            | verified: official video              |
| `son-tung-lac-troi`                       | Lạc Trôi                              | `Llw9Q6akRo4` | Sơn Tùng M-TP Official            | verified: official video              |
| `son-tung-muon-roi-ma-sao-con`            | Muộn Rồi Mà Sao Còn                   | `xypzmu5mMPY` | Sơn Tùng M-TP Official            | verified: official video              |
| `son-tung-dung-lam-trai-tim-anh-dau`      | Đừng Làm Trái Tim Anh Đau             | `abPmZCZZrFA` | Sơn Tùng M-TP Official            | verified: official video              |
| `soobin-phia-sau-mot-co-gai`              | Phía Sau Một Cô Gái                   | `vCIc1g_4JWM` | SOOBIN Official                   | verified: official video              |
| `soobin-anh-da-quen-voi-co-don`           | Anh Đã Quen Với Cô Đơn                | `X7sSE3yCNLI` | SOOBIN Official                   | verified: official video              |
| `soobin-gia-nhu`                          | Giá Như                               | `SeWt7IpZ0CA` | SOOBIN Official                   | verified: official video              |
| `soobin-dancing-in-the-dark`              | Dancing In The Dark                   | `OZmK0YuSmXU` | SOOBIN Official                   | verified: official video              |
| `jack-song-gio`                           | Sóng Gió                              | `j8U06veqxdU` | ICM Entertainment                 | verified: official video              |
| `jack-bac-phan`                           | Bạc Phận                              | `WX7dUj14Z00` | ICM Entertainment                 | verified: official video              |
| `jack-hong-nhan`                          | Hồng Nhan                             | `8x2NjwwHUbQ` | G5R SQUAD Official                | verified: official video              |
| `jack-hoa-hai-duong`                      | Hoa Hải Đường                         | `Bhg-Gw953b0` | J97                               | verified: official video              |
| `jack-thien-ly-oi`                        | Thiên Lý Ơi                           | `OrDB4jpA1g8` | J97                               | verified: official video              |
| `hngle-khong-buong`                       | Không Buông                           | `9UcQ7ddVjoc` | HNGLE / hưng lê                   | verified: official video              |
| `hngle-tim-em`                            | Tìm Em                                | `gJAbDSse5WM` | HNGLE / hưng lê                   | verified: official video              |
| `hieuthuhai-khong-the-say`                | Không Thể Say                         | `i0nd3NPJ4MI` | HIEUTHUHAI                        | verified: official video              |
| `hieuthuhai-ngu-mot-minh`                 | Ngủ Một Mình                          | `STjzkjnLlZ4` | HIEUTHUHAI                        | verified: official video              |
| `hieuthuhai-exit-sign`                    | Exit Sign                             | `sJt_i0hOugA` | HIEUTHUHAI                        | verified: official lyric video        |
| `den-mang-tien-ve-cho-me`                 | Mang Tiền Về Cho Mẹ                   | `UVbv-PJXm14` | Đen Vâu Official                  | verified: official video              |
| `den-di-ve-nha`                           | Đi Về Nhà                             | `vTJdVE_gjI0` | Đen Vâu Official                  | verified: official video              |
| `den-bai-nay-chill-phet`                  | Bài Này Chill Phết                    | `ddaEtFOsFeM` | Đen Vâu Official                  | verified: official video              |
| `mono-waiting-for-you`                    | Waiting For You                       | `okz5RIZRT0U` | Mono Official                     | verified: official video              |
| `mono-em-la`                              | Em Là                                 | `bpOwZ68fcQE` | Mono Official                     | verified: official video              |
| `mck-chim-sau`                            | Chìm Sâu                              | `Yw9Ra2UiVLw` | MCK // Nger                       | verified: official lyric video        |
| `tlinh-neu-luc-do`                        | Nếu Lúc Đó                            | `fyMgBQioTLo` | tlinh                             | verified: official video              |
| `tlinh-gai-doc-than`                      | Gái Độc Thân                          | `kFJd7U7vQ3o` | tlinh                             | verified: official video              |
| `hoa-minzy-bac-bling`                     | Bắc Bling                             | `CL13X-8o4h0` | Hòa Minzy                         | verified: official video              |
| `hoa-minzy-khong-the-cung-nhau-suot-kiep` | Không Thể Cùng Nhau Suốt Kiếp         | `ayJY9ieBuEU` | Hòa Minzy                         | verified: official video              |
| `vu-la-lung`                              | Lạ Lùng                               | `F5tS5m86bOI` | Vũ Official                       | verified: official video              |
| `vu-buoc-qua-nhau`                        | Bước Qua Nhau                         | `ixdSsW5n2rI` | Vũ Official                       | verified: official video              |
| `tang-duy-tan-ben-tren-tang-lau`          | Bên Trên Tầng Lầu                     | `LaxkmhiECfM` | Tăng Duy Tân                      | verified: official lyric video        |
| `tang-duy-tan-da-vu`                      | Dạ Vũ                                 | `1So7VBehCQg` | Tăng Duy Tân                      | verified: official video              |
| `hoang-thuy-linh-de-mi-noi-cho-ma-nghe`   | Để Mị Nói Cho Mà Nghe                 | `JAhdeizXpaQ` | Hoàng Thùy Linh                   | verified: official video              |
| `hoang-thuy-linh-see-tinh`                | See Tình                              | `gJHSDZfJrRY` | Hoàng Thùy Linh                   | verified: official video              |
| `duc-phuc-hon-ca-yeu`                     | Hơn Cả Yêu                            | `__kGJZ-kPno` | ĐỨC PHÚC OFFICIAL                 | verified: official video              |
| `duc-phuc-anh-nang-cua-anh`               | Ánh Nắng Của Anh                      | `-GgTYmhzviw` | Đức Phúc - Topic                  | verified: Topic channel (audio)       |
| `wren-evans-thich-em-hoi-nhieu`           | Thích Em Hơi Nhiều                    | `faSVTByG0LQ` | Wren Evans Official               | verified: official video              |
| `bich-phuong-bua-yeu`                     | Bùa Yêu                               | `FkOt19CUC30` | BÍCH PHƯƠNG                       | verified: official video              |
| `bich-phuong-di-du-dua-di`                | Đi Đu Đưa Đi                          | `ZF3b1nK-TjM` | BÍCH PHƯƠNG                       | verified: official video              |
| `my-tam-dau-chi-rieng-em`                 | Đâu Chỉ Riêng Em                      | `ttd3hNNxfZw` | My Tam                            | verified: official video              |
| `my-tam-uoc-gi`                           | Ước Gì                                | `On81-1xvt8o` | My Tam                            | verified: official video              |
| `bts-dynamite`                            | Dynamite                              | `gdZLi9oWNZg` | HYBE LABELS                       | verified: official video              |
| `bts-butter`                              | Butter                                | `WMweEpGlu_U` | HYBE LABELS                       | verified: official video              |
| `bts-boy-with-luv`                        | Boy With Luv                          | `XsX3ATc3FbA` | HYBE LABELS                       | verified: official video              |
| `bts-spring-day`                          | Spring Day                            | `xEeFrLSkMm8` | HYBE LABELS                       | verified: official video              |
| `bts-dna`                                 | DNA                                   | `MBdVXkSdhwU` | HYBE LABELS                       | verified: official video              |
| `bts-permission-to-dance`                 | Permission to Dance                   | `CuklIb9d3fI` | HYBE LABELS                       | verified: official video              |
| `jung-kook-seven`                         | Seven                                 | `QU9c0053UAU` | HYBE LABELS                       | verified: official video              |
| `jung-kook-standing-next-to-you`          | Standing Next to You                  | `UNo0TG9LwwI` | HYBE LABELS                       | verified: official video              |
| `jimin-like-crazy`                        | Like Crazy                            | `nOI67IDlNMQ` | HYBE LABELS                       | verified: official video              |
| `blackpink-how-you-like-that`             | How You Like That                     | `ioNng23DkIM` | BLACKPINK                         | verified: official video              |
| `blackpink-ddu-du-ddu-du`                 | DDU-DU DDU-DU                         | `IHNzOHi8sJs` | BLACKPINK                         | verified: official video              |
| `blackpink-pink-venom`                    | Pink Venom                            | `gQlMMD8auMs` | BLACKPINK                         | verified: official video              |
| `blackpink-shut-down`                     | Shut Down                             | `POe9SOEKotk` | BLACKPINK                         | verified: official video              |
| `rose-apt`                                | APT.                                  | `ekr2nIex040` | ROSÉ                              | verified: official video              |
| `jennie-solo`                             | SOLO                                  | `b73BI9eUkjM` | BLACKPINK                         | verified: official video              |
| `jennie-like-jennie`                      | like JENNIE                           | `JSFG-IE8n_c` | JennieRubyJaneVEVO                | verified: official video              |
| `lisa-money`                              | MONEY                                 | `dNCWe_6HAM8` | BLACKPINK                         | verified: official performance video  |
| `lisa-rockstar`                           | ROCKSTAR                              | `hbcGx4MGUMg` | LLOUD Official                    | verified: official video              |
| `newjeans-hype-boy`                       | Hype Boy                              | `11cta61wi0g` | HYBE LABELS                       | verified: official video              |
| `newjeans-ditto`                          | Ditto                                 | `pSUydWEqKwE` | HYBE LABELS                       | verified: official video              |
| `newjeans-omg`                            | OMG                                   | `sVTy_wmn5SU` | HYBE LABELS                       | verified: official video              |
| `newjeans-super-shy`                      | Super Shy                             | `ArmDp-zijuc` | HYBE LABELS                       | verified: official video              |
| `aespa-next-level`                        | Next Level                            | `4TWR90KJl84` | SMTOWN                            | verified: official video              |
| `aespa-supernova`                         | Supernova                             | `phuiiNCxRMg` | SMTOWN                            | verified: official video              |
| `aespa-whiplash`                          | Whiplash                              | `jWQx2f-CErU` | SMTOWN                            | verified: official video              |
| `ive-love-dive`                           | LOVE DIVE                             | `Y8JFxS1HlDo` | STARSHIP                          | verified: official video              |
| `ive-after-like`                          | After LIKE                            | `F0B7HDiY-10` | STARSHIP                          | verified: official video              |
| `ive-i-am`                                | I AM                                  | `6ZUIwj3FgUY` | STARSHIP                          | verified: official video              |
| `le-sserafim-antifragile`                 | ANTIFRAGILE                           | `pyf8cbqyfPs` | HYBE LABELS                       | verified: official video              |
| `le-sserafim-easy`                        | EASY                                  | `bNKXxwOQYB8` | HYBE LABELS                       | verified: official video              |
| `twice-fancy`                             | FANCY                                 | `kOHB85vDuow` | JYP Entertainment                 | verified: official video              |
| `twice-what-is-love`                      | What is Love?                         | `i0p1bmr0EmE` | JYP Entertainment                 | verified: official video              |
| `stray-kids-gods-menu`                    | God's Menu                            | `TQTlCHxyuu8` | JYP Entertainment                 | verified: official video              |
| `stray-kids-maniac`                       | MANIAC                                | `OvioeS1ZZ7o` | JYP Entertainment                 | verified: official video              |
| `stray-kids-s-class`                      | S-Class                               | `JsOOis4bBFg` | JYP Entertainment                 | verified: official video              |
| `seventeen-hot`                           | HOT                                   | `gRnuFC4Ualw` | HYBE LABELS                       | verified: official video              |
| `seventeen-super`                         | Super                                 | `-GQg25oP0S4` | HYBE LABELS                       | verified: official video              |
| `iu-blueming`                             | Blueming                              | `D1PvIWdJ8xo` | 1theK (원더케이)                  | verified: official video              |
| `iu-celebrity`                            | Celebrity                             | `0-q1KafFCLU` | 1theK (원더케이)                  | verified: official video              |
| `iu-love-wins-all`                        | Love wins all                         | `JleoAppaxi0` | 이지금 [IU Official]              | verified: official video              |
| `bigbang-haru-haru`                       | Haru Haru                             | `MzCbEdtNbJ0` | YG ENTERTAINMENT                  | verified: official video              |
| `bigbang-bang-bang-bang`                  | BANG BANG BANG                        | `2ips2mM7Zqw` | BIGBANG                           | verified: official video              |
| `g-dragon-power`                          | POWER                                 | `NMjhjrBIrG8` | OfficialGDRAGON                   | verified: official video              |
| `yoasobi-yoru-ni-kakeru`                  | 夜に駆ける (Yoru ni Kakeru)           | `x8VYWazR5mE` | YOASOBI                           | verified: official video              |
| `yoasobi-idol`                            | アイドル (Idol)                       | `ZRtdQ81jPUQ` | YOASOBI                           | verified: official video              |
| `kenshi-yonezu-lemon`                     | Lemon                                 | `SX_ViT4Ra7k` | Kenshi Yonezu 米津玄師            | verified: official video              |
| `kenshi-yonezu-kick-back`                 | KICK BACK                             | `M2cckDmNLMI` | Kenshi Yonezu 米津玄師            | verified: official video              |
| `higedan-pretender`                       | Pretender                             | `TQ8WlA2GXbk` | Official髭男dism                  | verified: official video              |
| `higedan-subtitle`                        | Subtitle                              | `hN5MBlGv2Ac` | Official髭男dism                  | verified: official video              |
| `ado-usseewa`                             | うっせぇわ (Usseewa)                  | `Qp3b-RXtz4w` | Ado                               | verified: official video              |
| `ado-new-genesis`                         | 新時代 (New Genesis)                  | `1FliVTcX8bQ` | Ado                               | verified: official video              |
| `fujii-kaze-shinunoga-e-wa`               | 死ぬのがいいわ (Shinunoga E-Wa)       | `dawrQnvwMTY` | Fujii Kaze                        | verified: official upload (not an MV) |
| `king-gnu-specialz`                       | SPECIALZ                              | `fhzKLBZJC3w` | King Gnu official YouTube channel | verified: official video              |
| `creepy-nuts-bling-bang-bang-born`        | Bling-Bang-Bang-Born                  | `Jg73p9udbAQ` | Creepy Nuts - Topic               | verified: Topic channel (audio)       |
| `aimer-zankyosanka`                       | 残響散歌 (Zankyosanka)                | `tLQLa6lM3Us` | Aimer Official YouTube Channel    | verified: official video              |
| `jay-chou-love-confession`                | 告白气球 (Love Confession)            | `bu7nU9Mhpyo` | 周杰倫 Jay Chou                   | verified: official video              |
| `jay-chou-sunny-day`                      | 晴天 (Sunny Day)                      | `DYptgVvkVLQ` | 周杰倫 Jay Chou                   | verified: official video              |
| `jay-chou-rice-field`                     | 稻香 (Rice Field)                     | `sHD_z90ZKV0` | 周杰倫 Jay Chou                   | verified: official video              |
| `gem-light-years-away`                    | 光年之外 (Light Years Away)           | `T4SimnaiktU` | GEMblog                           | verified: official video              |
| `gem-bubble`                              | 泡沫 (Bubble)                         | `mGeiABBB5f8` | GEMblog                           | verified: official video              |
| `jj-lin-jiang-nan`                        | 江南 (Jiang Nan)                      | `G97_rOdHcnY` | 太合音樂 Taihe Music-精選         | verified: official video              |
| `mayday-stubborn`                         | 倔强 (Stubborn)                       | `R2s-H_crYkc` | 滾石唱片 ROCK RECORDS             | verified: official video              |
| `mayday-suddenly-miss-you-so-bad`         | 突然好想你 (Suddenly Miss You So Bad) | `GtDRcXtDg-4` | 相信音樂BinMusic                  | verified: official video              |
| `eason-chan-lonely-warrior`               | 孤勇者 (Lonely Warrior)               | `Hlp8XD0R5qo` | Eason Chan                        | verified: official video              |

## Rejected candidates

| Track id                                  | Video id      | Why it was not used                                                                                                       |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `jennie-solo`                             | `b73BtZ-Rcsk` | 404: the video does not exist                                                                                             |
| `bigbang-haru-haru`                       | `MZjAN4hP5xk` | 404: the video does not exist                                                                                             |
| `jennie-solo`                             | `SreBDIEhd5I` | not an official channel: Viral (JENNIE - 'SOLO' M/V (Official Video))                                                     |
| `jimin-like-crazy`                        | `o46hLIT9NLw` | not an official channel: ATTACK OF SONG (Jimin 지민 'Like Crazy' Official Music Video)                                    |
| `jennie-like-jennie`                      | `8ioDiKme0VI` | 404: the video does not exist                                                                                             |
| `jennie-like-jennie`                      | `_F3qZtJTLzk` | 404: the video does not exist                                                                                             |
| `lisa-rockstar`                           | `2YiglxCSkGA` | not an official channel: GrindModeJoe (LISA - ROCKSTAR (Official Music Video) \\                                          | REACTION)                                              |
| `lisa-rockstar`                           | `CY6ZwzLukQ4` | 404: the video does not exist                                                                                             |
| `lisa-rockstar`                           | `C6EQysT_5i8` | not an official channel: Juani Monte (LISA “ROCKSTAR" (Official Music Video) M/V \\                                       | REACCIÓN)                                              |
| `stray-kids-maniac`                       | `VG4lpTHuytc` | not an official channel: Stray Kids - Topic (MANIAC)                                                                      |
| `stray-kids-maniac`                       | `APB-AKpnKT4` | not an official channel: Stray Kids (Stray Kids "MANIAC" Performance \\                                                   | MTV Fresh Out)                                         |
| `seventeen-super`                         | `wNS3fAP6kVQ` | not an official channel: itsANDYandJAS (SEVENTEEN (세븐틴) '손오공 (Super)' Official MV \\                                | REACTION!)                                             |
| `seventeen-super`                         | `M8W9fpTPf-A` | not an official channel: ATTACK OF SONG (SEVENTEEN 세븐틴 '손오공' Official Music Video)                                  |
| `bigbang-haru-haru`                       | `4ntLFU82MGc` | not an official channel: parkerlewisrocks (Big Bang - Haru Haru (하루하루) MV (HD))                                       |
| `bigbang-haru-haru`                       | `iEYPVwJg7MM` | not an official channel: kos4617 ([MV] BigBang 하루하루( Haru Haru ) Part.1)                                              |
| `g-dragon-power`                          | `G_-7Koy7voA` | not an official channel: itsANDYandJAS (G-DRAGON - POWER (Official Video) \\                                              | REACTION + LYRICS EXPLAINED/ OUR INTERPRETATIONS!)     |
| `higedan-subtitle`                        | `cI_oR1li_Nc` | not an official channel: JPOP_Natsu (Official髭男dism - Subtitle \\                                                       | 일드 '사일런트' Silent OST - Subtitle)                 |
| `fujii-kaze-shinunoga-e-wa`               | `3zh9Wb1KuW8` | not an official channel: Fujii Kaze - Topic (Shinunoga E-Wa)                                                              |
| `fujii-kaze-shinunoga-e-wa`               | `LN9ip-OA4Kw` | not an official channel: FAKE J-POP (【藤井 風】 死ぬのがいいわ（1949年）)                                                |
| `king-gnu-specialz`                       | `OSxhhhbtkWw` | 404: the video does not exist                                                                                             |
| `king-gnu-specialz`                       | `5RaU8K8sLTM` | not an official channel: King Gnu - Topic (SPECIALZ)                                                                      |
| `creepy-nuts-bling-bang-bang-born`        | `5NzfqW_Yt6Y` | not an official channel: TheAnimeMen (Bling-Bang-Bang-Born (Official Music Video))                                        |
| `creepy-nuts-bling-bang-bang-born`        | `1c8SdWhUXP0` | not an official channel: CDPRR (Creepy Nuts - Bling-Bang-Bang-Born \\                                                     | OPテーマ「Mashle: Magic and Muscles Season 2」)        |
| `creepy-nuts-bling-bang-bang-born`        | `pCoU2jL2esw` | not an official channel: TheGoodVibe (Creepy Nuts - Bling-Bang-Bang-Born)                                                 |
| `aimer-zankyosanka`                       | `hlCJ5puEKfQ` | not an official channel: Aimerrhythm - Topic (残響散歌)                                                                   |
| `jay-chou-sunny-day`                      | `SJKoWAd5ySo` | not an official channel: Jay Chou - Topic (晴天)                                                                          |
| `jay-chou-rice-field`                     | `tffsErz0I2s` | not an official channel: 杰威爾歌詞MV頻道JVR Lyric MV (Jay Chou 周杰倫【稻香 Rice Field】 Official Music Video [4K])      |
| `jay-chou-rice-field`                     | `CmVAQbnpCHg` | not an official channel: longshanlung (稻香 MV - 周杰倫 Jay Chou [HQ高清])                                                |
| `gem-light-years-away`                    | `KqVN10ICaE0` | not an official channel: RAD (G E M 【光年之外 LIGHT YEARS AWAY 】MV 電影《太空潛航者 Passengers》中文主題曲 鄧紫棋)      |
| `gem-light-years-away`                    | `TW39nVDnpHk` | not an official channel: 毓唐古箏 (光年之外 LIGHT YEARS AWAY \\                                                           | 鄧紫棋 G.E.M. \\                                       | 街頭藝人 \\                       | 毓唐古箏 Candy \\          | Music \\ | Chinese Instruments Guzheng Cover) |
| `jj-lin-jiang-nan`                        | `QUNcX9Z3Mqo` | not an official channel: JJ Lin - Topic (江南)                                                                            |
| `jj-lin-jiang-nan`                        | `_GrTlZOGVic` | not an official channel: 申申明常 (林俊傑 江南 （高清版）)                                                                |
| `mayday-stubborn`                         | `QUs1qyBtUhQ` | not an official channel: ROCK RECORDS English (【ENG SUB】Mayday 五月天【Stubborn 倔強】Official Music Video)             |
| `mayday-suddenly-miss-you-so-bad`         | `6WFuOPVnyLk` | not an official channel: 柏呈昇 (五月天-突然好想你MV)                                                                     |
| `mayday-suddenly-miss-you-so-bad`         | `EopCPbEj1FA` | not an official channel: Mayday - Topic (突然好想你)                                                                      |
| `eason-chan-lonely-warrior`               | `E-MBcgOPHJg` | not an official channel: Eason Chan - Topic (孤勇者 (《英雄聯盟：雙城之戰》動畫劇集中文主題曲))                           |
| `eason-chan-lonely-warrior`               | `ht5BgMQZWxI` | not an official channel: Music For A Better Life (孤勇者 \\                                                               | 陈奕迅)                                                |
| `son-tung-muon-roi-ma-sao-con`            | `dLoIOUe1oes` | not an official channel: Sơn Tùng M-TP - Topic (Muộn Rồi Mà Sao Còn)                                                      |
| `son-tung-muon-roi-ma-sao-con`            | `qbK_VpdqdKQ` | not an official channel: Nguyễn Hương Ly Official (MUỘN RỒI MÀ SAO CÒN - SƠN TÙNG M-TP \\                                 | HƯƠNG LY COVER)                                        |
| `son-tung-dung-lam-trai-tim-anh-dau`      | `7u4g483WTzw` | not an official channel: Sơn Tùng M-TP - Topic (Đừng Làm Trái Tim Anh Đau)                                                |
| `son-tung-dung-lam-trai-tim-anh-dau`      | `qu8CyAXODqk` | not an official channel: Anh Kiet Nguyen Hoang (Đừng Làm Trái Tim Anh Đau \\                                              | Official Video Sơn Tùng M-TP)                          |
| `soobin-phia-sau-mot-co-gai`              | `7qN-cWtDjgI` | 403: embedding is turned off                                                                                              |
| `soobin-anh-da-quen-voi-co-don`           | `wzbMNQEAA9Y` | not an official channel: SOOBIN Official (Anh Đã Quen Với Cô Đơn - Soobin Hoàng Sơn \\                                    | Official Lyrics Video)                                 |
| `soobin-anh-da-quen-voi-co-don`           | `MOFaq64Nsuk` | 403: embedding is turned off                                                                                              |
| `soobin-anh-da-quen-voi-co-don`           | `kvqQ9Hh9Ur4` | not an official channel: Bảng Xếp Hạng VPop (Anh Đã Quen Với Cô Đơn - Soobin Hoàng Sơn \\                                 | Music Video)                                           |
| `soobin-gia-nhu`                          | `1SZT7p3XxYU` | not an official channel: HPH Official (SOOBIN - giá như \\                                                                | Official MV \\                                         | HPH Reaction)                     |
| `soobin-gia-nhu`                          | `0hciYzUYyTk` | not an official channel: SOOBIN Official (SOOBIN - giá như \\                                                             | MV Teaser)                                             |
| `soobin-dancing-in-the-dark`              | `KtDT_xTRbTA` | 403: embedding is turned off                                                                                              |
| `soobin-dancing-in-the-dark`              | `0gGIxsbeotw` | not an official channel: SOOBIN - Topic (DANCING IN THE DARK)                                                             |
| `jack-bac-phan`                           | `3M2ZvMPU7YE` | not an official channel: Anh Duy Official (BẠC PHẬN - K-ICM x JACK \\                                                     | ANH DUY COVER)                                         |
| `jack-bac-phan`                           | `5fdVRj6ThMM` | not an official channel: K-ICM - Topic (Bạc Phận)                                                                         |
| `jack-hong-nhan`                          | `MnzdvcJsp18` | not an official channel: J97 (JACK - J97 \\                                                                               | CHÚNG TA RỒI SẼ HẠNH PHÚC \\                           | Official Music Video)             |
| `jack-hong-nhan`                          | `OeGbLMvFS7E` | not an official channel: G5R Entertainment (Hồng Nhan - Jack x K-ICM \\                                                   | Official Music Video)                                  |
| `jack-hoa-hai-duong`                      | `bcxuNF5vetw` | 404: the video does not exist                                                                                             |
| `jack-hoa-hai-duong`                      | `hwEEKb0jr-4` | not an official channel: CT Bắp Studio (HOA HẢI ĐƯỜNG - JACK \\                                                           | NHƯ MAI COVER \\                                       | CT BẮP STUDIO)                    |
| `jack-thien-ly-oi`                        | `kyIulRMJS3o` | 404: the video does not exist                                                                                             |
| `jack-thien-ly-oi`                        | `knkmrAVOlyM` | not an official channel: Huy Vạc (THIÊN LÝ ƠI \\                                                                          | JACK - J97 \\                                          | HUY VẠC COVER)                    |
| `hngle-khong-buong`                       | `Bllg86Fm9wI` | not an official channel: HPH Official (Hngle - KHÔNG BUÔNG ft. Ari \\                                                     | Official Music Video \\                                | HPH Reaction)                     |
| `hngle-khong-buong`                       | `13QJB0nMhHY` | not an official channel: Nguyên Trần Official (KHÔNG BUÔNG - Hngle ft. Ari \\                                             | Nguyenn x Aric x Yiepan cover)                         |
| `hngle-khong-buong`                       | `5008LmjAq-g` | not an official channel: Hngle - Topic (Không Buông)                                                                      |
| `hieuthuhai-khong-the-say`                | `5PvzGDU8WjM` | not an official channel: HIEUTHUHAI (HIEUTHUHAI - Không Thể Say \\                                                        | Live Performance at Sóng 24)                           |
| `hieuthuhai-khong-the-say`                | `2LVWoAIzI4U` | not an official channel: HIEUTHUHAI - Topic (Không Thể Say)                                                               |
| `hieuthuhai-ngu-mot-minh`                 | `1OJQdxT6WHE` | not an official channel: HIEUTHUHAI (hieuthuhai - ngủ một mình (tình rất tình) ft. negav (prod. by kewtiie))              |
| `hieuthuhai-ngu-mot-minh`                 | `fjgvaBM4rv4` | not an official channel: ViXua (hieuthuhai - ngủ một mình ft. negav (prod. by kewtiie) \\                                 | Bài nhạc hay ho ra máu🤧 \\                            | ViXua Reaction)                   |
| `hieuthuhai-exit-sign`                    | `epd9hJsPiGg` | not an official channel: HIEUTHUHAI (HIEUTHUHAI - Exit Sign ft. marzuz \\                                                 | Live Performance at Sóng 26)                           |
| `hieuthuhai-exit-sign`                    | `TiLlTrHWEEQ` | not an official channel: GENfest (Exit Sign - HIEUTHUHAI ft. marzuz \\                                                    | Live at GENfest 23 \\                                  | Fancam Focus \\                   | Live Performance)          |
| `hieuthuhai-exit-sign`                    | `Fwsl_XS4sYQ` | not an official channel: HIEUTHUHAI - Topic (Exit Sign)                                                                   |
| `den-mang-tien-ve-cho-me`                 | `z9h9ACfbon4` | not an official channel: HPH Official (Đen - Mang Tiền Về Cho Mẹ ft. Nguyên Thảo (M/V) \\                                 | HPH Reaction)                                          |
| `den-mang-tien-ve-cho-me`                 | `js-rEIbjYeM` | not an official channel: Đen - Topic (Mang Tiền Về Cho Mẹ (feat. Nguyên Thảo))                                            |
| `den-di-ve-nha`                           | `SfVqTHW5cIU` | not an official channel: Đen - Topic (Đi Về Nhà)                                                                          |
| `den-bai-nay-chill-phet`                  | `gHi6u6zu8w8` | not an official channel: QUANG ĐĂNG (ĐEN ft. MIN - Bài Này Chill Phết \\                                                  | Quang Dang Choreography)                               |
| `den-bai-nay-chill-phet`                  | `NqJXz1QVXOE` | not an official channel: #mol (BÀI NÀY CHILL PHẾT \\                                                                      | ĐEN X MIN \\                                           | Lyrics & Engsub Video)            |
| `den-bai-nay-chill-phet`                  | `eJZ65JSoM6I` | not an official channel: Đen - Topic (Bài Này Chill Phết)                                                                 |
| `mono-waiting-for-you`                    | `CHw1b_1LVBA` | not an official channel: Mono Official (MONO - Waiting For You (Album 22 - Track No.10))                                  |
| `mono-em-la`                              | `sRUoOA21ZFI` | not an official channel: Mono Official (MONO - Em Là (Album 22 - Track No.03))                                            |
| `mono-em-la`                              | `URKozxi-v1U` | not an official channel: MONO - Topic (EM LÀ)                                                                             |
| `mck-chim-sau`                            | `4r-mrN5y7W8` | not an official channel: Chokie Nguyen Official (Chìm Sâu - RPT MCK (feat. Trung Trần) \\                                 | Nhạc để Chill \\                                       | (CHOKIE Reaction !!!))            |
| `mck-chim-sau`                            | `cgCA-jP5QSY` | not an official channel: MCK // Nger (02. Chìm Sâu - RPT MCK ( ft. Trung Trần ) \\                                        | " 99% " the album)                                     |
| `mck-chim-sau`                            | `kIo1MyeIMRI` | not an official channel: Rôn Vinh Official (Chìm Sâu - RPT MCK (feat. Trung Trần) \\                                      | Tu Salmon x Pro. Rôn Vinh \\                           | Nhạc Hot Tik Tok 2022)            |
| `mck-chim-sau`                            | `929Gk_zJQc4` | not an official channel: Hà Trần (Chìm sâu - RPT MCK ( feat. Trung Trần) \\                                               | Cover guitar by Hatran)                                |
| `mck-chim-sau`                            | `ibdv2YMelWs` | not an official channel: Alvn (Chìm sâu (RPT MCK ft. Trung Trần) \\                                                       | Guitar cover \\                                        | alvin)                            |
| `tlinh-neu-luc-do`                        | `7Hf8Xd8O7FM` | 404: the video does not exist                                                                                             |
| `tlinh-neu-luc-do`                        | `9p9b14mojFs` | not an official channel: JP Dance Studio (tlinh - nếu lúc đó (ft. 2pillz) \\                                              | JP Dance Team)                                         |
| `tlinh-neu-luc-do`                        | `5FAQeDg0o58` | not an official channel: ViruSs Reaction (tlinh - nếu lúc đó (ft. 2pillz) \\                                              | Viruss Reaction !)                                     |
| `tlinh-neu-luc-do`                        | `27Q74nknDyk` | not an official channel: tlinh - Topic (nếu lúc đó)                                                                       |
| `tlinh-gai-doc-than`                      | `44uvIqEmFZ0` | not an official channel: CAC Official (Gái Độc Thân - tlinh \\                                                            | DANCE CHOREOGHRAPHY BY C.A.C)                          |
| `hoa-minzy-bac-bling`                     | `Ljb1yUlMhDk` | not an official channel: Jee Trần Official (BẮC BLING (BẮC NINH) \\                                                       | HOÀ MINZY ft NS XUÂN HINH x MASEW x TUẤN CRY \\        | JEE TRẦN COVER)                   |
| `hoa-minzy-bac-bling`                     | `f8KnxZlF8q8` | not an official channel: Masew (BẮC BLING \\                                                                              | HOÀ MINZY ft NS XUÂN HINH x MASEW x TUẤN CRY \\        | Instrumental)                     |
| `hoa-minzy-khong-the-cung-nhau-suot-kiep` | `3HR7pusJ5zU` | not an official channel: An Coong Piano (KHÔNG THỂ CÙNG NHAU SUỐT KIẾP - HOÀ MINZY \\                                     | \\                                                     | \\                                | PIANO COVER)               |
| `hoa-minzy-khong-the-cung-nhau-suot-kiep` | `eu4AEtGP0tw` | not an official channel: Hoà Minzy - Topic (Không Thể Cùng Nhau Suốt Kiếp)                                                |
| `vu-la-lung`                              | `Yhq8Qb9UzDs` | not an official channel: Mây Saigon Official (LẠ LÙNG - VŨ \\                                                             | Official Music Video \\                                | Mây Saigon)                       |
| `vu-la-lung`                              | `zysgLZvpBQo` | not an official channel: Chuonn (Lạ Lùng - Vũ. \\                                                                         | MV Lyric HD)                                           |
| `vu-la-lung`                              | `jv7WQeIPGjY` | not an official channel: Mây Saigon Official (Lạ Lùng - Vũ \\                                                             | Official Music Video \\                                | Live at Mây Sài Gòn)              |
| `tang-duy-tan-ben-tren-tang-lau`          | `4acQF-FdevE` | not an official channel: ViruSs Reaction (Tăng Duy Tân - Bên Trên Tầng Lầu \\                                             | ViruSs Reaction !)                                     |
| `tang-duy-tan-ben-tren-tang-lau`          | `a1Y7lYwb84Q` | not an official channel: Đinh Lữ (Bên Trên Tầng Lầu - Tăng Duy Tân \\                                                     | Đinh Lữ \\                                             | Violin Cover)                     |
| `tang-duy-tan-ben-tren-tang-lau`          | `uok2G0UwMu0` | not an official channel: ViruSs Reaction (Tăng Duy Tân - Bên Trên Tầng Lầu \\                                             | Freestyle Piano ViruSs.)                               |
| `tang-duy-tan-da-vu`                      | `o0t_Rwn_TtQ` | not an official channel: VRT (DẠ VŨ \\                                                                                    | (BAE) TĂNG DUY TÂN X (BAE) VRT ( Remix ))              |
| `tang-duy-tan-da-vu`                      | `5FZpcjdXa1o` | 404: the video does not exist                                                                                             |
| `tang-duy-tan-da-vu`                      | `r7eyDyNfc2Y` | not an official channel: Ngọc Bích Official (DẠ VŨ - TĂNG DUY TÂN \\                                                      | BÚP COVER)                                             |
| `tang-duy-tan-da-vu`                      | `RXhYLqh7Dt0` | not an official channel: Chunn Guitar (Dạ Vũ - Tăng Duy Tân \\                                                            | Guitar hướng dẫn (Palm thùng) \\                       | Chunn)                            |
| `hoang-thuy-linh-de-mi-noi-cho-ma-nghe`   | `YZOzTBLRDsk` | not an official channel: QUANG ĐĂNG (Hoàng Thuỳ Linh - Để Mị Nói Cho Mà Nghe \\                                           | Quang Dang Choreography)                               |
| `hoang-thuy-linh-see-tinh`                | `gtarw6wgJfI` | not an official channel: Mưa. (Hoàng Thùy Linh - See Tình \\                                                              | Official Visualizer Video)                             |
| `hoang-thuy-linh-see-tinh`                | `JlLCmd6X3hc` | not an official channel: Hoàng Thùy Linh (Hoàng Thuỳ Linh - See Tình \\                                                   | First Look)                                            |
| `duc-phuc-hon-ca-yeu`                     | `2qIDJkw08IE` | not an official channel: Mây Saigon Official (Hơn Cả Yêu - Đức Phúc \\                                                    | Mây Saigon)                                            |
| `duc-phuc-hon-ca-yeu`                     | `YeiaMdi4uiw` | not an official channel: Daz Music (Hơn Cả Yêu - Đức Phúc \\                                                              | Lyrics Video)                                          |
| `duc-phuc-hon-ca-yeu`                     | `WdCsWw1Szz8` | not an official channel: ĐỨC PHÚC OFFICIAL (Đức Phúc - Hơn Cả Yêu (Official Karaoke))                                     |
| `bich-phuong-bua-yeu`                     | `2ikwZXGYnL4` | not an official channel: Phan Như Thùy Official (BÙA YÊU - BÍCH PHƯƠNG \\                                                 | OFFICIAL MV \\                                         | COVER \\                          | ANIE NHƯ THÙY)             |
| `bich-phuong-di-du-dua-di`                | `mjIbzbWrDaM` | not an official channel: Bích Phương - Topic (Đi Đu Đưa Đi)                                                               |
| `bich-phuong-di-du-dua-di`                | `l9L5Bxdofus` | not an official channel: POPS MUSIC (ĐI ĐU ĐƯA ĐI \\                                                                      | BÍCH PHƯƠNG \\                                         | TIGER REMIX COUNTDOWN STAGE 2021) |
| `my-tam-dau-chi-rieng-em`                 | `0dTWqcfENQk` | not an official channel: Liveshow Unicorn (Đâu Chỉ Riêng Em - Mỹ Tâm \\                                                   | Album Các Bài Hát Live Hay Như Nuốt Đĩa Của Mỹ Tâm)    |
| `bigbang-haru-haru`                       | `gwsv57tmnWc` | not an official channel: TSPTE3 ([HD] BIGBANG - Haru Haru [Day By Day] Official Music Video (MV Download Link + Eng Sub)) |
| `bigbang-haru-haru`                       | `d5h1wUn55Ik` | not an official channel: Tuổi Ther Box (BigBang - Haru Haru (2008) \\                                                     | \\                                                     | MV \\                             | \\                         | FullHD)  |
| `duc-phuc-anh-nang-cua-anh`               | `ds_U7Ifvsx4` | not an official channel: YEAH1 MUSIC (Ánh Nắng Của Anh - OST Chờ Em Đến Ngày Mai \\                                       | Đức Phúc \\                                            | Official MV \\                    | Nhạc trẻ hay mới nhất)     |
| `duc-phuc-anh-nang-cua-anh`               | `1P4DaXgzVnE` | not an official channel: TRẤN THÀNH TOWN (Ánh Nắng Của Anh (Chờ Em Đến Ngày Mai OST))                                     |
| `duc-phuc-anh-nang-cua-anh`               | `ZBl9G47H0Po` | 403: embedding is turned off                                                                                              |
| `duc-phuc-anh-nang-cua-anh`               | `3UyotSd-Cp4` | not an official channel: bimm (Ánh nắng của anh ❤️ Đức Phúc)                                                              |
| `duc-phuc-anh-nang-cua-anh`               | `akWNG8dbczs` | 404: the video does not exist                                                                                             |
| `my-tam-uoc-gi`                           | `4fp1hZTa8_8` | not an official channel: My Tam (Mỹ Tâm - Ước Gì \\                                                                       | Live Tour Sức Mạnh Những Ước Mơ (THE POWER OF DREAMS)) |
| `my-tam-uoc-gi`                           | `7INn3KW_gJM` | not an official channel: My Tam (Mỹ Tâm - Ước Gì \\                                                                       | Liveshow Những Giai Điệu Của Thời Gian)                |
| `my-tam-uoc-gi`                           | `LCUDNQripn0` | not an official channel: Trực Titus (Ước Gì - Mỹ Tâm \\                                                                   | Sáng tác: Võ Thiện Thanh \\                            | Violin Lofi Station #21 \\        | Minh Trực violin cover 🎻) |
| `fujii-kaze-shinunoga-e-wa`               | `lRVJuPI5IXI` | not an official channel: Fujii Kaze (Fujii Kaze - "Shinunoga E-Wa" Live at Nippon Budokan (2020))                         |
| `fujii-kaze-shinunoga-e-wa`               | `DrdayAB-XFM` | 401: embedding is turned off                                                                                              |
| `fujii-kaze-shinunoga-e-wa`               | `AIEu_0J93y0` | not an official channel: Lee Dae hwa (Fujii Kaze - Shinunoga E-wa \\                                                      | easy lyrics)                                           |
| `fujii-kaze-shinunoga-e-wa`               | `UxKLnuQ3FZw` | not an official channel: Lyricss_Beat (shinunoga e-wa - fujii kaze \\                                                     | edit audio)                                            |
