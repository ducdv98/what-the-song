# Food candidates expansion (research notes)

Result: 139 NEW Dishes in `candidates-expansion.jsonl` (existing 80 untouched), combined 219 seeds; `python tools/validate_food_seed.py` on the concatenation reports `validated 219 Food seeds`.

## Counts

| Tier | New |
|---|---|
| easy | 8 |
| medium | 58 |
| hard | 65 |
| expert | 7 |
| impossible | 1 |

| Region | New |
|---|---|
| Nam | 47 |
| Toàn quốc | 42 |
| Bắc | 39 |
| Trung | 11 |

| Source | New | Share |
|---|---|---|
| openverse_id (mostly Flickr) | 97 | 70% |
| commons_url | 42 | 30% |

Combined with the existing 80 (all commons_url): 219 total, 42+80 = 122 commons, 97 openverse.

## Verification done
- Every row's licence/author/URLs were re-read with `tools/ingest_food.py` (`openverse_info` for the 97 Openverse rows, `commons_info` for the Commons rows, requests paced at 2 s, no photos downloaded into the repo). All passed the ingest LICENCE regex (CC BY / CC BY-SA / CC0 only, non-empty author, https URLs). One Commons row (Mứt dừa) failed `commons_info` (`imageinfo` missing, file probably deleted) and was dropped.
- Each chosen photo was looked at (thumbnail contact sheets) to confirm the dish is the subject.
- `licence` in the jsonl is the ingest-verified string (version included), `author` the verified creator.

## Flags for the owner

- **Tây Nguyên: 0 new Dishes.** Openverse/Commons returned no usable CC photo for Gà nướng Buôn Ma Thuột, Phở khô Gia Lai, Canh thụt, Lẩu gà lá é, Heo rừng nướng, Cà phê Buôn Ma Thuột, Rượu ghè, Bánh tráng nướng Đà Lạt (only a vendor-portrait photo), etc. The set stays at the existing 2 (Cơm lam, Rượu cần). Needs hand-picked Commons/Flickr photos or a relaxed approach.
- **Trung is thin (11)** and Huế court food is poorly covered for the same reason (Bánh nậm, Bánh ram ít, Bánh ép, Tré, Bánh bèo chén had no usable photo or duplicated existing dishes).
- **Tier skew:** national-fame tiers were assigned from general knowledge, not a survey. Mix is easy 8 / medium 58 / hard 65 / expert 7 / impossible 1, so the expert and impossible tiers are still under-served; owner should re-tier. Regions were also set from general knowledge (vi.wikipedia was not re-read for each), default Toàn quốc when a dish is national; uncertain ones: Bún cá rô (Bắc), Mì xào, Bắp xào/Bắp nướng/Khoai lang nướng (Toàn quốc vs Nam), Bánh bò nướng (Nam), Trà gừng, Gà nướng, Xoài lắc (Nam), Sá sùng (set Bắc: Quảng Ninh/Vân Đồn; also eaten in Trung), Bún mắm nêm (Trung; also Nam), Bún quậy (Nam, Phú Quốc/Kiên Giang).
- **Weak or ambiguous photos** (I accepted but recommend a second look): Bánh canh cua (bowl has shrimp/pork, title says thịt cua), Cháo gà, Bánh ướt tôm chấy, Bánh ít nhân dừa, Bánh mì xíu mại (bowl+bread), Bún quậy (sauce bowl prominent), Cháo canh, Gà nướng (looks tandoori-like), Mì xào (instant-noodle style), Chè bơ, Kem xôi, Bánh bò hấp, Sá sùng (dried, not served), Thắng cố (pot only), Bánh cáy.
- **Photos with a watermark/overlay** from Vietnamese recipe sites uploaded to Flickr under CC (HelenRecipes, mayxaydunganh.vn, etc.). The licence field says CC, but these accounts may not hold rights to the pictures; the owner may prefer to avoid them. Rows with a recipe-site style title: Sinh tố bơ, Cơm chiên, Cơm gà Hội An, Bánh tiêu, Chè đậu xanh, Trà sữa trân châu, Bánh bông lan trứng muối, Bánh khoai mì nướng, Xôi vò, Bánh ít nhân dừa, Tôm nướng muối ớt, Canh khổ qua nhồi thịt, Đậu phụ sốt cà chua, Rau muống xào tỏi, Mứt gừng, Mứt me, Chè hạt sen, Chè ba màu, Bánh gối, Chè thái, Cơm cháy, Xôi khúc, Bánh ú, Bò bía, Há cảo, Kem dừa, Kem chuối, Bắp xào, Rau câu, Tôm rang, Sườn xào chua ngọt, Bò lúc lắc, Bánh bao nhân thịt, Tào phớ, Sương sa hạt lựu, Phở áp chảo, Bún mắm nêm, Cá chiên giòn, Nem chua rán, Chè bột lọc, Mứt bí, Chè bơ, Xôi chiên, Canh bí đao, Tôm hấp nước dừa.

- **Same concept as an existing Dish, so not added:** Bánh rán (= bánh cam), Bánh bèo chén (= Bánh bèo), Bún mọc, Bún đậu, Cơm sườn nướng (= cơm tấm), Bánh cuốn nóng/chả, Bún măng, Chả giò chay, Chè long nhãn (same photo as Chè hạt sen), Bánh xèo miền Tây/Bình Định.

## Rejected / not added (reason)
- No CC photo found at all (or none showing the dish): Ốc luộc, Gỏi ngó sen, Chè trôi nước, Chè thập cẩm, Sữa chua nếp cẩm, Cà phê cốt dừa, Sữa chua đánh đá, Chân gà sả tắc, Bún dọc mùng, Bún cá Châu Đốc, Hủ tiếu gõ, Phở chua Lạng Sơn, Mì Quảng ếch, Bánh canh chả cá, Cơm âm phủ, Cơm rượu, Xôi ngũ sắc, Xôi bắp, Bánh ram ít, Bánh ép Huế, Bánh ú tro, Bánh ít lá gai, Bánh tằm bì, Bánh xèo tôm nhảy, Bánh tráng Phơi Sương, Bánh tráng me, Bánh ướt lòng gà, Hoành thánh chiên, Chả cá thác lác, Cà ri vịt, Vịt nấu chao, Ghẹ hấp, Cá bống kho tiêu, Lẩu cá kèo, Đậu hũ nhồi thịt, Cà pháo muối, Củ kiệu tôm khô, Trà atiso, Chè đậu đỏ, Chè sầu riêng, Chè đậu ván, Kẹo dừa Bến Tre, Bánh cuốn Thanh Trì, Nhum biển, Nem Phùng, Cá kho làng Vũ Đại, Mắc khén, Thịt lợn cắp nách, Pa pỉnh tộp, Muối kiến vàng and the Tây Nguyên items above.
- Photo wrong subject (search hit was a person, building, car, etc.) or photo showing the market/vendor not the dish: Bánh tráng nướng, Bò bía (ucama roll was gỏi cuốn), Vịt quay (Peking duck / kitchen), Mực nướng, Cơm cháy/Cơm niêu (wrong dish), Bánh canh Trảng Bàng (shop sign), Cơm gạo lứt, Trà đào, Chả bò, Giò bò, Cốm (person dominates), Kẹo lạc/Thịt chua (packaged goods), Mắm tôm/Mắm ruốc, Pate, Gà rán, Bia hơi, Rượu đế/Rượu nếp, Trà sen, Nước chanh, Cà phê đen.
- Weak or doubtful photos dropped: Mứt dừa (Commons file failed API check), Bánh phồng sữa, Chè đỗ đen, Bánh đa kê, Bánh sắn, Bánh khảo, Chè kho.

## Sources cited
- Openverse API: https://api.openverse.org/v1/images/ (search, license=by,by-sa,cc0) and /v1/images/<id>/ (via `openverse_info`) for licence, creator, landing URL.
- Wikimedia Commons API (https://commons.wikimedia.org/w/api.php, `imageinfo` extmetadata LicenseShortName/Artist) via `commons_info`, for the Commons rows.
- Dish names, regions and what each dish is: general knowledge plus the titles/descriptions of the licensed photos; not individually re-checked against vi.wikipedia or heritage sources in this pass. Owner review of Tier/Region/Aliases (as in issue 01) is needed.

## Problems hit
- Openverse search is strict about multi-word queries: long English glosses returned 0 results; accented Vietnamese names worked best. Many Vietnamese dishes simply have no CC image there.
- Openverse `/thumb/` proxy returned 424 for most images, so Flickr thumbnails were fetched from the Flickr URLs directly.
- upload.wikimedia.org thumbnails returned repeated 429 (Retry-After 1-10 s); thumbnails were fetched slowly (2.5 s apart with backoff). Wikimedia API (`commons_info`) was used only for the final 42 verifications. Wikimedia thumb sizes must be standard steps (330 px worked, 360 px gave HTTP 400).
- Some Openverse wikimedia records give a `?curid=` landing URL, so Commons `File:` URLs were rebuilt from the image path.
- Aliases: only genuine alternates; the validator confirmed no cross-list collisions.

## New Dishes

| # | Name | Aliases | Tier | Region | Source | Licence | Author |
|---|---|---|---|---|---|---|---|
| 1 | Bánh bao | steamed bun | easy | Toàn quốc | openverse | CC BY-SA 2.0 | avlxyz |
| 2 | Sinh tố bơ | avocado smoothie | easy | Toàn quốc | openverse | CC0 1.0 | oecvip |
| 3 | Cơm chiên | cơm rang, fried rice | easy | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 4 | Phở gà |  | easy | Bắc | openverse | CC BY-SA 2.0 | dionhinchcliffe |
| 5 | Cơm gà Hội An | cơm gà | medium | Trung | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 6 | Bánh ướt thịt nướng |  | hard | Trung | openverse | CC BY-SA 2.0 | avlxyz |
| 7 | Hủ tiếu khô |  | medium | Nam | openverse | CC BY-SA 3.0 | Kham Tran - www.khamtran.com |
| 8 | Bò né |  | medium | Nam | openverse | CC BY-SA 2.0 | Nicolas.Ho |
| 9 | Cháo gà |  | medium | Toàn quốc | openverse | CC BY-SA 2.0 | KEVINETSAI |
| 10 | Cà ri gà |  | medium | Nam | openverse | CC BY 2.0 | HungryHuy |
| 11 | Gỏi gà |  | medium | Toàn quốc | openverse | CC BY 2.0 | T.Tseng |
| 12 | Nem lụi |  | medium | Trung | openverse | CC BY-SA 2.0 | Charles Haynes |
| 13 | Bánh chưng chiên |  | medium | Bắc | openverse | CC BY 2.0 | Andrea_Nguyen |
| 14 | Bánh bò nướng |  | medium | Nam | openverse | CC BY 2.0 | Andrea_Nguyen |
| 15 | Bánh tiêu |  | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 16 | Chè đậu xanh |  | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 17 | Sữa đậu nành | soy milk | medium | Toàn quốc | openverse | CC0 1.0 | oecvip |
| 18 | Cà phê phin | Vietnamese drip coffee | medium | Toàn quốc | openverse | CC BY 2.0 | HungryHuy |
| 19 | Nước dừa | coconut water | medium | Nam | openverse | CC BY-SA 2.0 | Phú Thịnh Co |
| 20 | Trà sữa trân châu | trà sữa, bubble tea | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 21 | Bánh bông lan trứng muối |  | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 22 | Bánh khoai mì nướng |  | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 23 | Cua rang me |  | medium | Nam | openverse | CC BY-SA 2.0 | Charles Haynes |
| 24 | Cháo ếch | cháo ếch Singapore | hard | Bắc | openverse | CC0 1.0 | oecvip |
| 25 | Xôi vò |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 26 | Bánh khoái |  | hard | Trung | openverse | CC BY-SA 2.0 | Charles Haynes |
| 27 | Bánh ướt tôm chấy |  | hard | Trung | openverse | CC BY 2.0 | goosmurf |
| 28 | Bánh ít nhân dừa |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 29 | Bánh phồng tôm |  | hard | Toàn quốc | openverse | CC BY-SA 3.0 | Memberofc1 (thảo luận) |
| 30 | Bánh mì xíu mại |  | hard | Nam | openverse | CC BY 2.0 | IAHilltopper |
| 31 | Gỏi đu đủ | papaya salad | hard | Toàn quốc | openverse | CC BY 2.0 | tuey |
| 32 | Sò lông nướng mỡ hành |  | hard | Nam | openverse | CC BY 2.0 | Coco Kim |
| 33 | Ốc len xào dừa |  | hard | Nam | openverse | CC BY 2.0 | Coco Kim |
| 34 | Tôm nướng muối ớt |  | hard | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 35 | Lẩu cá |  | medium | Toàn quốc | openverse | CC0 1.0 | Saigon Time |
| 36 | Canh khổ qua nhồi thịt | khổ qua hầm | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 37 | Đậu phụ sốt cà chua |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 38 | Rau muống xào tỏi | rau muống xào | hard | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 39 | Mứt gừng |  | hard | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 40 | Mứt me |  | hard | Nam | openverse | CC0 1.0 | oecvip |
| 41 | Chè hạt sen | chè sen | hard | Trung | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 42 | Chè ba màu | chè ba màu, three colour dessert | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 43 | Mè xửng |  | expert | Trung | openverse | CC BY-SA 2.0 | buechertiger |
| 44 | Bánh gối |  | expert | Bắc | openverse | CC0 1.0 | oecvip |
| 45 | Sá sùng |  | impossible | Bắc | openverse | CC BY 2.0 | Andrea_Nguyen |
| 46 | Xôi lá cẩm |  | hard | Bắc | openverse | CC BY 2.0 | morning_rumtea |
| 47 | Xôi | xôi mặn, sticky rice | easy | Toàn quốc | openverse | CC BY 2.0 | Prince Roy |
| 48 | Bánh flan | crème caramel | easy | Toàn quốc | openverse | CC BY-SA 2.0 | johnlemon |
| 49 | Chè thái |  | easy | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 50 | Phở cuốn |  | easy | Bắc | openverse | CC BY 2.0 | midorisyu |
| 51 | Bánh canh cua |  | medium | Nam | openverse | CC BY-SA 2.0 | avlxyz |
| 52 | Chả quế |  | medium | Bắc | openverse | CC BY 2.0 | autonome |
| 53 | Dê nướng |  | medium | Bắc | openverse | CC BY-SA 2.0 | johnlemon |
| 54 | Lẩu bò |  | medium | Toàn quốc | openverse | CC0 1.0 | Saigon Time |
| 55 | Cơm cháy | cơm cháy Ninh Bình | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 56 | Xôi khúc |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 57 | Bánh ú |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 58 | Bò bía |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 59 | Há cảo |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 60 | Chả mực | chả mực Hạ Long | hard | Bắc | openverse | CC BY-SA 2.0 | dungbanhdeo |
| 61 | Khô bò |  | hard | Nam | openverse | CC BY 2.0 | KAIProductions™ |
| 62 | Kem dừa |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 63 | Kem chuối |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 64 | Kem xôi |  | hard | Bắc | openverse | CC BY 2.0 | Joel Riedesel |
| 65 | Bắp xào | bắp xào bơ | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 66 | Khoai lang nướng |  | medium | Toàn quốc | openverse | CC0 1.0 | Saigon Time |
| 67 | Mì xào |  | medium | Toàn quốc | openverse | CC0 1.0 | Saigon Time |
| 68 | Phở xào |  | medium | Bắc | openverse | CC BY-SA 2.0 | Haydn Blackey |
| 69 | Bánh mì heo quay |  | medium | Nam | openverse | CC BY-SA 2.0 | jasonlam |
| 70 | Bún bò xào |  | medium | Nam | openverse | CC BY-SA 2.0 | jenarrr |
| 71 | Rau câu | rau câu dừa | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 72 | Gỏi tôm thịt |  | hard | Nam | openverse | CC BY 2.0 | insatiablemunch |
| 73 | Ếch chiên bơ |  | hard | Nam | openverse | CC BY 2.0 | T.Tseng |
| 74 | Ốc xào |  | medium | Nam | openverse | CC BY-SA 2.0 | ezola |
| 75 | Ốc hương |  | hard | Toàn quốc | openverse | CC BY 2.0 | Tri Nguyen / P h o t o g r a p h y |
| 76 | Tôm rang |  | hard | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 77 | Sườn xào chua ngọt |  | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 78 | Bò lúc lắc | shaking beef | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 79 | Cánh gà chiên nước mắm |  | medium | Toàn quốc | openverse | CC BY 2.0 | Prince Roy |
| 80 | Bánh bao nhân thịt |  | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 81 | Tào phớ | tàu hũ, tàu hủ nước đường | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 82 | Bún chả giò |  | medium | Nam | openverse | CC BY-SA 2.0 | jasonlam |
| 83 | Mì vằn thắn | mì hoành thánh, wonton noodles | medium | Toàn quốc | commons | CC BY-SA 4.0 | Hoangkid |
| 84 | Bánh mì chảo |  | medium | Nam | commons | CC BY 2.0 | Vinnie Cartabiano |
| 85 | Bún cá rô |  | hard | Bắc | commons | CC BY-SA 4.0 | Phương Huy |
| 86 | Miến gà |  | medium | Bắc | commons | CC BY-SA 2.0 | Thang Nguyen from Nottingham, United Kin |
| 87 | Miến xào |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Phương Huy |
| 88 | Bánh tôm Hồ Tây | bánh tôm | medium | Bắc | commons | CC BY-SA 4.0 | Phương Huy |
| 89 | Bánh mì que |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Baoothersks |
| 90 | Bánh phu thê | bánh su sê | medium | Bắc | commons | CC BY-SA 2.0 | Lucas Jans from USA |
| 91 | Bạc xỉu |  | medium | Nam | commons | CC BY-SA 4.0 | Klientos |
| 92 | Xoài lắc |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Nguyenhai314 |
| 93 | Gà nướng |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Phương Huy |
| 94 | Phở vịt quay |  | hard | Bắc | commons | CC BY-SA 4.0 | Hoangvanjidan |
| 95 | Hàu nướng mỡ hành |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Phương Huy |
| 96 | Bún quậy |  | hard | Nam | commons | CC BY-SA 4.0 | Phương Huy |
| 97 | Bún nước lèo |  | hard | Nam | commons | CC BY 4.0 | Ngohaison1201 |
| 98 | Mì vịt tiềm |  | hard | Nam | commons | CC BY 2.0 | SauceSupreme |
| 99 | Cháo canh |  | hard | Trung | commons | CC BY-SA 4.0 | Nhân Quảng |
| 100 | Cơm gà Tam Kỳ |  | hard | Trung | commons | CC BY-SA 3.0 | Đông Sơn (thảo luận) |
| 101 | Lạp xưởng |  | hard | Nam | commons | CC BY-SA 4.0 | Nhlamm96 |
| 102 | Gỏi khô bò |  | hard | Nam | commons | CC BY-SA 2.0 | stu_spivack |
| 103 | Nộm hoa chuối | gỏi bắp chuối | hard | Bắc | commons | CC BY-SA 4.0 | Jicara Foodie Traveller |
| 104 | Gỏi cá trích |  | hard | Nam | commons | CC BY-SA 4.0 | OlBoes |
| 105 | Bê thui |  | hard | Nam | commons | CC BY-SA 3.0 | Memberofc1 |
| 106 | Ốc bươu nhồi thịt |  | hard | Bắc | commons | CC BY-SA 4.0 | Phương Huy |
| 107 | Cá nướng muối ớt |  | hard | Toàn quốc | commons | CC BY-SA 4.0 | Phương Huy |
| 108 | Canh măng |  | hard | Bắc | commons | CC BY-SA 4.0 | Phương Huy |
| 109 | Thắng cố |  | expert | Bắc | commons | CC BY-SA 2.0 | Alpha |
| 110 | Bánh áp chao |  | expert | Bắc | commons | CC BY 3.0 | Chu Anh Tú |
| 111 | Bánh cáy |  | expert | Bắc | commons | CC BY-SA 4.0 | Nguyễn Thanh Quang |
| 112 | Tiết canh |  | hard | Bắc | commons | CC BY-SA 4.0 | Viethavvh |
| 113 | Nem thính |  | hard | Bắc | commons | CC BY-SA 3.0 | Hungda |
| 114 | Sương sa hạt lựu |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 115 | Bánh khúc |  | hard | Bắc | openverse | CC BY 2.0 | Andrea_Nguyen |
| 116 | Khâu nhục |  | expert | Bắc | commons | CC BY-SA 4.0 | Leduong5004864 |
| 117 | Phở áp chảo |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 118 | Phở bò tái |  | medium | Bắc | openverse | CC BY-SA 2.0 | pelican |
| 119 | Bún mắm nêm |  | expert | Trung | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 120 | Lẩu dê |  | medium | Bắc | openverse | CC BY-SA 2.0 | johnlemon |
| 121 | Gà hấp |  | medium | Toàn quốc | commons | CC BY-SA 4.0 | Phương Huy |
| 122 | Cá diêu hồng |  | hard | Nam | commons | CC BY-SA 4.0 | Phương Huy |
| 123 | Cá chiên giòn |  | medium | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 124 | Nem chua rán |  | medium | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 125 | Trà gừng |  | hard | Toàn quốc | commons | CC0 | Phương Huy |
| 126 | Trà Thái Nguyên |  | hard | Bắc | commons | CC0 | Phương Huy |
| 127 | Chè bột lọc |  | hard | Trung | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 128 | Mứt bí |  | hard | Toàn quốc | openverse | CC0 1.0 | oecvip |
| 129 | Chè bơ |  | medium | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 130 | Khô cá dứa |  | hard | Nam | commons | CC0 | Phương Huy |
| 131 | Tôm khô |  | hard | Toàn quốc | commons | CC BY 2.0 | Petr Ruzicka from Prague, CZ |
| 132 | Bánh đúc nóng |  | hard | Bắc | openverse | CC BY 2.0 | librarianidol |
| 133 | Xôi gà |  | medium | Toàn quốc | commons | CC BY 2.0 | Yuichi Kosio |
| 134 | Xôi chiên |  | hard | Bắc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 135 | Canh bí đao |  | hard | Toàn quốc | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 136 | Tôm hấp nước dừa |  | hard | Nam | openverse | CC BY-SA 2.0 | Đam Mê Ẩm Thực |
| 137 | Sò huyết |  | medium | Nam | commons | CC BY-SA 4.0 | Baoothersks |
| 138 | Nghêu hấp sả |  | medium | Nam | commons | CC BY-SA 4.0 | Phương Huy |
| 139 | Bánh bò hấp |  | medium | Nam | commons | CC BY-SA 3.0 | Memberofc1 |
