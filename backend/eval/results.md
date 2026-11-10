# Search evaluation

Made by `npm run ai:eval`. Do not edit by hand: run it again.

- Date: 2026-11-10
- Embedding model: `gemini-embedding-2`
- Catalog: 122 tracks, 122 with a vector
- Queries: 33 from `eval/search-queries.json`, top 10 of each search

## Summary

| Search | Recall@10 | MRR@10 | nDCG@10 |
| --- | ---: | ---: | ---: |
| Keyword only | 0.273 | 0.273 | 0.273 |
| Vector only | 0.635 | 0.705 | 0.611 |
| Hybrid (RRF) | 0.635 | 0.720 | 0.622 |

Averages over all queries. **Keyword only** is the search by words (accents and case ignored); **vector only** is the nearest tracks by meaning; **hybrid** merges the two with Reciprocal Rank Fusion, as `GET /api/search/semantic` does.

## By kind of query

| Kind of query | Queries | Keyword only nDCG@10 | Vector only nDCG@10 | Hybrid (RRF) nDCG@10 |
| --- | ---: | ---: | ---: | ---: |
| title | 5 | 1.000 | 0.926 | 1.000 |
| artist | 5 | 0.800 | 1.000 | 1.000 |
| mood | 9 | 0.000 | 0.423 | 0.423 |
| occasion | 7 | 0.000 | 0.191 | 0.191 |
| genre | 6 | 0.000 | 0.831 | 0.831 |
| mixed | 1 | 0.000 | 0.390 | 0.390 |

## By query

| Query | Kind | Relevant | Keyword only nDCG | Vector only nDCG | Hybrid (RRF) nDCG | First hit (K / V / H) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lạc trôi | title | 1 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| see tinh | title | 1 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| pink venom | title | 1 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| dynamite | title | 1 | 1.000 | 0.631 | 1.000 | 1 / 2 / 1 |
| lemon | title | 1 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| son tung | artist | 6 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| blackpink | artist | 4 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| jack | artist | 5 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| mỹ tâm | artist | 2 | 1.000 | 1.000 | 1.000 | 1 / 1 / 1 |
| đen vâu | artist | 3 | 0.000 | 1.000 | 1.000 | - / 1 / 1 |
| nhạc buồn ngày mưa | mood | 4 | 0.000 | 0.123 | 0.123 | - / 8 / 8 |
| bài hát thất tình chia tay | mood | 9 | 0.000 | 0.219 | 0.219 | - / 3 / 3 |
| nhạc chill thư giãn cuối tuần | mood | 9 | 0.000 | 0.423 | 0.423 | - / 1 / 1 |
| nhạc nhẹ nhàng để ngủ | mood | 3 | 0.000 | 0.671 | 0.671 | - / 1 / 1 |
| nhạc tình yêu lãng mạn cho đám cưới | mood | 5 | 0.000 | 0.301 | 0.301 | - / 3 / 3 |
| nhạc nhớ nhà ngày tết | mood | 4 | 0.000 | 0.637 | 0.637 | - / 1 / 1 |
| nhạc tập gym | occasion | 12 | 0.000 | 0.064 | 0.064 | - / 10 / 10 |
| nhạc chạy bộ buổi sáng | occasion | 6 | 0.000 | 0.130 | 0.130 | - / 4 / 4 |
| nhạc nghe khi lái xe ban đêm | occasion | 6 | 0.000 | 0.000 | 0.000 | - / - / - |
| nhạc nền làm việc tập trung | occasion | 4 | 0.000 | 0.832 | 0.832 | - / 1 / 1 |
| nhạc quẩy tiệc tùng | occasion | 9 | 0.000 | 0.309 | 0.309 | - / 1 / 1 |
| nhạc anime Nhật Bản | genre | 6 | 0.000 | 0.944 | 0.944 | - / 1 / 1 |
| nhạc Hoa lời Trung | genre | 9 | 0.000 | 1.000 | 1.000 | - / 1 / 1 |
| nhạc rap Việt | genre | 10 | 0.000 | 0.763 | 0.763 | - / 1 / 1 |
| ballad Nhật Bản buồn | genre | 3 | 0.000 | 0.947 | 0.947 | - / 1 / 1 |
| ballad xưa thập niên 2000 | genre | 4 | 0.000 | 0.723 | 0.723 | - / 2 / 2 |
| sad songs for a rainy night | mood | 5 | 0.000 | 0.102 | 0.102 | - / 9 / 9 |
| workout music | occasion | 12 | 0.000 | 0.000 | 0.000 | - / - / - |
| relaxing background music | mood | 5 | 0.000 | 0.854 | 0.854 | - / 1 / 1 |
| romantic love song | mood | 8 | 0.000 | 0.474 | 0.474 | - / 2 / 2 |
| upbeat dance party songs | occasion | 8 | 0.000 | 0.000 | 0.000 | - / - / - |
| epic cinematic soundtrack | genre | 3 | 0.000 | 0.611 | 0.611 | - / 1 / 1 |
| k-pop vui tươi dạo phố mùa hè | mixed | 6 | 0.000 | 0.390 | 0.390 | - / 2 / 2 |

## Where hybrid is worse than the better single list

None (within 0.05 nDCG).

## How to read this

- **Recall@10**: the share of the relevant tracks that are in the first 10. A query with more than 10 relevant tracks cannot reach 1.
- **MRR@10**: 1 / the position of the first relevant track (0 if there is none in the first 10), averaged.
- **nDCG@10**: rewards relevant tracks near the top; 1 is the ideal order.
- The relevant tracks were chosen by a person from the title, the artist, the language and the region of each song, and from the catalog metadata. That metadata is also the text the vectors are made from, so mood and occasion queries favour the vector search a little; title and artist queries do not.
- 33 queries are enough to compare the three searches, not to tell a 0.02 difference from noise.
