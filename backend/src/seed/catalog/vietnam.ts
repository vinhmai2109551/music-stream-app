import {
  createArtist,
  createHitsAlbums,
  createTrack,
  type SeedArtist,
  type SeedTrack,
} from "./shared.js"

const artist = (id: string, name: string, baseFollowers: number, bio: string) =>
  createArtist("VIETNAM", id, name, baseFollowers, bio)

const track = (artistId: string, slug: string, title: string, plays: number, durationSec: number) =>
  createTrack("VIETNAM", artistId, slug, title, plays, durationSec)

export const ARTISTS: SeedArtist[] = [
  artist(
    "son-tung",
    "Sơn Tùng M-TP",
    3_800_000,
    "Vietnamese singer-songwriter and producer known for “Lạc Trôi” and “Hãy Trao Cho Anh”.",
  ),
  artist(
    "soobin",
    "SOOBIN",
    1_300_000,
    "Vietnamese singer-songwriter, also known as Soobin Hoàng Sơn, known for “Phía Sau Một Cô Gái”.",
  ),
  artist(
    "jack",
    "Jack - J97",
    2_100_000,
    "Vietnamese singer-songwriter known by the stage name Jack (J97), whose songs include “Hồng Nhan” and “Hoa Hải Đường”.",
  ),
  artist(
    "hngle",
    "Hngle",
    420_000,
    "Vietnamese singer-songwriter known for “Không Buông” and “Tìm Em”.",
  ),
  artist(
    "hieuthuhai",
    "HIEUTHUHAI",
    1_900_000,
    "Vietnamese rapper and singer known for “Không Thể Say” and “Exit Sign”.",
  ),
  artist(
    "den",
    "Đen",
    2_000_000,
    "Vietnamese rapper and singer-songwriter, also known as Đen Vâu, whose songs include “Đi Về Nhà” and “Mang Tiền Về Cho Mẹ”.",
  ),
  artist(
    "mono",
    "MONO",
    900_000,
    "Vietnamese singer-songwriter known for “Waiting For You” and “Em Là”.",
  ),
  artist(
    "mck",
    "RPT MCK",
    1_100_000,
    "Vietnamese rapper, performing as RPT MCK, known for “Chìm Sâu”.",
  ),
  artist(
    "tlinh",
    "tlinh",
    1_200_000,
    "Vietnamese rapper and singer known for “Gái Độc Thân” and “Nếu Lúc Đó”.",
  ),
  artist(
    "hoa-minzy",
    "Hòa Minzy",
    1_500_000,
    "Vietnamese pop singer known for “Bắc Bling” and “Không Thể Cùng Nhau Suốt Kiếp”.",
  ),
  artist(
    "vu",
    "Vũ.",
    900_000,
    "Vietnamese singer-songwriter known for “Lạ Lùng” and “Bước Qua Nhau”.",
  ),
  artist(
    "tang-duy-tan",
    "Tăng Duy Tân",
    1_100_000,
    "Vietnamese singer-songwriter known for “Bên Trên Tầng Lầu” and “Dạ Vũ”.",
  ),
  artist(
    "hoang-thuy-linh",
    "Hoàng Thùy Linh",
    1_400_000,
    "Vietnamese pop singer and actress known for “Để Mị Nói Cho Mà Nghe” and “See Tình”.",
  ),
  artist(
    "duc-phuc",
    "Đức Phúc",
    800_000,
    "Vietnamese pop singer known for “Hơn Cả Yêu” and “Ánh Nắng Của Anh”.",
  ),
  artist(
    "wren-evans",
    "Wren Evans",
    700_000,
    "Vietnamese singer-songwriter known for “Thích Em Hơi Nhiều”.",
  ),
  artist(
    "bich-phuong",
    "Bích Phương",
    1_000_000,
    "Vietnamese pop singer known for “Bùa Yêu” and “Đi Đu Đưa Đi”.",
  ),
  artist(
    "my-tam",
    "Mỹ Tâm",
    2_300_000,
    "Vietnamese pop singer known for “Đâu Chỉ Riêng Em” and “Ước Gì”.",
  ),
]

// approximate: update to real file length
export const TRACKS: SeedTrack[] = [
  track("son-tung", "chung-ta-cua-hien-tai", "Chúng Ta Của Hiện Tại", 95_000_000, 301),
  track("son-tung", "hay-trao-cho-anh", "Hãy Trao Cho Anh", 110_000_000, 247),
  track("son-tung", "noi-nay-co-anh", "Nơi Này Có Anh", 105_000_000, 260),
  track("son-tung", "lac-troi", "Lạc Trôi", 125_000_000, 232),
  track("son-tung", "muon-roi-ma-sao-con", "Muộn Rồi Mà Sao Còn", 140_000_000, 276),
  track("son-tung", "dung-lam-trai-tim-anh-dau", "Đừng Làm Trái Tim Anh Đau", 98_000_000, 266),
  track("soobin", "phia-sau-mot-co-gai", "Phía Sau Một Cô Gái", 60_000_000, 269),
  track("soobin", "anh-da-quen-voi-co-don", "Anh Đã Quen Với Cô Đơn", 38_000_000, 258),
  track("soobin", "gia-nhu", "Giá Như", 30_000_000, 245),
  track("soobin", "dancing-in-the-dark", "Dancing In The Dark", 18_000_000, 214),
  track("jack", "song-gio", "Sóng Gió", 85_000_000, 264),
  track("jack", "bac-phan", "Bạc Phận", 90_000_000, 253),
  track("jack", "hong-nhan", "Hồng Nhan", 100_000_000, 247),
  track("jack", "hoa-hai-duong", "Hoa Hải Đường", 70_000_000, 222),
  track("jack", "thien-ly-oi", "Thiên Lý Ơi", 65_000_000, 233),
  track("hngle", "khong-buong", "Không Buông", 115_000_000, 236),
  track("hngle", "tim-em", "Tìm Em", 45_000_000, 248),
  track("hieuthuhai", "khong-the-say", "Không Thể Say", 80_000_000, 214),
  track("hieuthuhai", "ngu-mot-minh", "Ngủ Một Mình", 55_000_000, 218),
  track("hieuthuhai", "exit-sign", "Exit Sign", 150_000_000, 201),
  track("den", "mang-tien-ve-cho-me", "Mang Tiền Về Cho Mẹ", 120_000_000, 253),
  track("den", "di-ve-nha", "Đi Về Nhà", 95_000_000, 245),
  track("den", "bai-nay-chill-phet", "Bài Này Chill Phết", 85_000_000, 233),
  track("mono", "waiting-for-you", "Waiting For You", 130_000_000, 258),
  track("mono", "em-la", "Em Là", 45_000_000, 225),
  track("mck", "chim-sau", "Chìm Sâu", 70_000_000, 226),
  track("tlinh", "neu-luc-do", "Nếu Lúc Đó", 60_000_000, 218),
  track("tlinh", "gai-doc-than", "Gái Độc Thân", 75_000_000, 200),
  track("hoa-minzy", "bac-bling", "Bắc Bling", 55_000_000, 258),
  track(
    "hoa-minzy",
    "khong-the-cung-nhau-suot-kiep",
    "Không Thể Cùng Nhau Suốt Kiếp",
    40_000_000,
    278,
  ),
  track("vu", "la-lung", "Lạ Lùng", 50_000_000, 276),
  track("vu", "buoc-qua-nhau", "Bước Qua Nhau", 60_000_000, 253),
  track("tang-duy-tan", "ben-tren-tang-lau", "Bên Trên Tầng Lầu", 70_000_000, 244),
  track("tang-duy-tan", "da-vu", "Dạ Vũ", 25_000_000, 256),
  track("hoang-thuy-linh", "de-mi-noi-cho-ma-nghe", "Để Mị Nói Cho Mà Nghe", 60_000_000, 205),
  track("hoang-thuy-linh", "see-tinh", "See Tình", 55_000_000, 168),
  track("duc-phuc", "hon-ca-yeu", "Hơn Cả Yêu", 50_000_000, 262),
  track("duc-phuc", "anh-nang-cua-anh", "Ánh Nắng Của Anh", 55_000_000, 245),
  track("wren-evans", "thich-em-hoi-nhieu", "Thích Em Hơi Nhiều", 70_000_000, 200),
  track("bich-phuong", "bua-yeu", "Bùa Yêu", 85_000_000, 207),
  track("bich-phuong", "di-du-dua-di", "Đi Đu Đưa Đi", 60_000_000, 196),
  track("my-tam", "dau-chi-rieng-em", "Đâu Chỉ Riêng Em", 30_000_000, 265),
  track("my-tam", "uoc-gi", "Ước Gì", 28_000_000, 262),
]

export const ALBUMS = createHitsAlbums(ARTISTS, TRACKS)
