# Vietnamese copy guide — revised review draft

**Status:** direction approved and applied to the Vietnamese and English UI on 2026-10-01. This replaces the earlier draft, whose “friendly Gen Z” voice was based on brand marketing and contained phrases that do not sound natural to a Vietnamese speaker. Read the [social-language research notes](VOICE-RESEARCH.md) for the evidence and its limits.

## 1. What the research can and cannot tell us

The useful evidence is how people talk **about music** in public conversations: short questions, “bài này”, “nghe quen”, a guessed title, and quick reactions. See the linked posts and comment context in [the research notes](VOICE-RESEARCH.md). These are firsthand posts, but they are a small, self-selected sample. We cannot verify commenters' ages, and a Reddit/forum voice does not stand for all Vietnamese Gen Z users. Public TikTok, Facebook and Threads comments were not consistently accessible for this review. This is a limit, not permission to invent how people there speak.

The critical distinction: **social speech is reference material, not product copy to paste.** An app button is allowed to sound like a button. It does not need to impersonate a friend, add slang, or say “nhé” after each action.

## 2. Proposed register

Use normal, contemporary Vietnamese. Keep the interface concise and mostly neutral. Reserve any personality for the game premise and results, and only use a line that a Vietnamese reviewer would actually say aloud.

| Surface | Register | Example of the kind of wording to prefer |
| --- | --- | --- |
| Action button | Direct, standard UI | “Phát”, “Đoán”, “Bỏ qua”, “Bài tiếp” |
| Game question | Brief and situational | “Bài gì đây?” |
| Help/cost | Literal | “Bỏ qua để nghe đoạn {seconds}. Điểm còn {points}.” |
| Result | State the outcome | “Đúng rồi” / “Chưa đoán ra” |
| Account/error | Plain service language | “Điểm của khách sẽ mất khi đóng tab.” |
| Legal | Precise, neutral | Keep all rights and license facts intact. |

Do not pursue “Gen Z tone” as an amount of slang. A young player can recognize contemporary speech in “bài gì đây?” without being addressed in meme language. Preserve Vietnamese diacritics and conventional spelling in the app even when a source comment abbreviates words.

### Register to avoid

- Invented chatty game-host lines: “Chỉ cần {at} nhạc”, “Ra bài rồi!”, “Chốt đáp án”, “Đoạn tiếp: …”. These were in the previous draft without evidence that people say them in this setting.
- A cheerleader after every tap: repeated exclamation marks, “đỉnh”, “xịn”, “cháy”, “quẩy”, or emoji in core controls.
- Tutorial fragments written as a slogan: “Nhấn phát. Nghe kỹ. Đoán tên bài.”
- A personified app voice (“tụi mình”, “mình”) when no character is speaking.
- Formal product language during play: “câu trả lời của bạn”, “với tư cách khách”, “phiên bản nhạc Việt”.

This is a proposed boundary for **persistent UI**. A short-lived social post could have its own voice, but that needs a real example and its own review.

## 3. Terminology and mechanics

| Meaning | Working term | Guardrail |
| --- | --- | --- |
| The track to identify | **bài hát** or **bài** when space is tight | Do not use “bản nhạc” merely to vary words. |
| Each playable clue | **đoạn nhạc** | It may start anywhere, so avoid “nốt đầu tiên”, “intro”, or “điệp khúc” as general claims. |
| Progress through clues | **gợi ý** | Existing term is understandable; no evidence yet that “lượt nghe” is better. |
| Pass on current clue | **Bỏ qua** | Keep this familiar button unless user testing shows confusion. Adjacent helper explains the longer clip and score cost. |
| Submit a picked song | **Đoán** | The selected song already provides context. Do not rename it “Chốt đáp án” just to sound younger. |
| Reveal without a guess | **Chịu thua** or **Xem đáp án** | Both have different emotional effects. Keep current “Chịu thua” pending review; do not silently change its meaning. |
| Maximum score still available | **còn {points} điểm** | A skip/wrong guess reduces the maximum available score; it does not deduct previously earned points. |
| Difficulty | Current labels for now | The tier describes song familiarity, not clip length or player ability. Any renaming needs a separate UI review. |

`{seconds}` is the **total length of the newly unlocked clip**, not seconds added. Do not say “thêm {seconds} giây”. `{at}` in results is the clip length at which the player guessed; it is not the time they spent listening or the number of plays.

## 4. Copy decisions

This table records the wording that was applied after review. “Low risk” means the wording is simple and preserves the behavior; it does not mean it has passed a broader player study. Keys refer to [`messages.ts`](../apps/web/lib/i18n/messages.ts).

| Key / context | Before | Applied wording / decision | Note |
| --- | --- | --- | --- |
| `app.edition` | “Phiên bản nhạc Việt” | “Nhạc Việt” | Low risk; shorter and already used as the short edition label. |
| `app.headlineOne/Two` | “Nghe nhạc. / Đoán tên.” | “Nghe nhạc / Đoán bài” | Needs visual and native review. Remove forced sentence punctuation; do not invent a clever slogan. |
| `app.intro` | “Một đoạn nhạc. Một bài hát quen. Bạn có nhận ra ngay từ những nốt đầu tiên?” | “Nghe một đoạn nhạc rồi đoán tên bài hát.” | Low risk; removes an inaccurate claim about where clips start. |
| `app.footnote` | “Nghe ít hơn. Đoán sớm hơn. Ghi điểm cao hơn.” | “Đoán càng sớm, điểm càng cao.” | Low risk; one useful rule instead of a three-part slogan. |
| `round.title` | “Bạn đang nghe bài gì?” | “Bài gì đây?” | Worth native review; this resembles an actual music-identification question. |
| `round.playHint` | “Nhấn phát. Nghe kỹ. Đoán tên bài.” | “Bấm phát để nghe.” | Can be removed later if the play control proves self-evident. |
| `round.answer` | “Câu trả lời của bạn” | “Tên bài hát” | Low risk, but do not repeat the placeholder unnecessarily. |
| `round.guessPlaceholder` | “Bài hát hoặc ca sĩ…” | “Tìm bài hát hoặc ca sĩ” | Low risk; search is what the field does. |
| `round.skip` | “Bỏ qua” | Keep. | The old draft's “Nghe thêm” was an unsupported rewrite. |
| `round.skipCost` | “Bỏ qua để nghe {seconds} · còn {points} điểm.” | “Bỏ qua để nghe đoạn {seconds}. Còn {points} điểm.” | Keeps the point cost beside the action. |
| `round.guess` | “Đoán” | Keep. | Clear and short. |
| `round.giveUp` | “Chịu thua” | Keep pending native review. | “Xem đáp án” is a possible alternative, but should be chosen deliberately. |
| `result.guessedIn` | “Đoán đúng ở {at}!” | “Đúng rồi” on the stamp; show clip length in a separate label or existing history. | This needs a small UI change if chosen. Do not force `{at}` into unnatural speech. |
| `result.lost` | “Thua!” | “Chưa đoán ra” | Review with voluntary give-up and last wrong guess. Neutral and less sharp. |
| `result.next` | “Bài tiếp” | Keep. | Natural and accurate. |
| `result.tryAgain` | “Thử lại” | “Bài tiếp” | This action starts a new song, so “Thử lại” suggests the wrong behavior. |
| `result.copied` | “Đã chép!” | “Đã sao chép” | Conventional status. |
| `loading.body` | “Đang chuẩn bị những giai điệu quen thuộc…” | “Đang tải nhạc…” | Remove filler; loader should give status. |
| `difficulty.empty` | “...gắn ‘tier’ cho bài trong seed.” | “Mức này chưa có bài.” | Must remove internal authoring language from a player screen. |

The hero lines and result stamp remain the highest-risk choices for future player validation. The guide does not claim that a social post proves these are good UI labels.

## 5. States outside the main round

### Guest and account

Explain the tradeoff once, in the place where it matters. The current guest notice repeats a pitch and sounds administrative. A restrained candidate is:

> **Chơi không cần tài khoản**  
> Điểm và chuỗi thắng chỉ được giữ trong tab này và sẽ mất khi đóng tab. Tạo tài khoản hoặc đăng nhập để lưu thành tích và tham gia bảng xếp hạng.

Check the exact storage behavior and whether showing the same account actions in the header makes a long notice unnecessary. Keep buttons “Tạo tài khoản”, “Đăng nhập”, “Để sau”. Do not promise that guest rounds transfer into an account; they do not.

### Errors and empty states

Say what failed and what the player can do. Avoid `nhé` as a default suffix.

| State | Working candidate | Behavior check |
| --- | --- | --- |
| No song in genre | “Thể loại này chưa có bài. Chọn thể loại khác.” | Player can change genre. |
| Music library unavailable | “Không tải được thư viện nhạc. Thử lại.” | Do not tell a player to run ingest tools. |
| Audio playback failed | “Không phát được đoạn nhạc. Thử phát lại.” | Retry is possible. |
| Leaderboard empty | “Chưa có ai ghi điểm trong kỳ này.” | Period may be week or month. |
| Account server offline | “Không kết nối được tài khoản. Bạn vẫn chơi được.” | Guest play works. |
| Wrong login | “Tên đăng nhập, email hoặc mật khẩu chưa đúng.” | Do not reveal which field was wrong. |
| Too many attempts | “Thử quá nhiều lần. Đợi vài phút rồi thử lại.” | Keep the wait instruction. |

Validation hints should state exact character and length limits. The app should not apologize for a wrong guess or joke about an error.

### FAQ

Use straightforward Vietnamese and keep the mechanics. One possible opening answer:

> Bấm phát để nghe đoạn nhạc. Tìm bài hát hoặc ca sĩ, chọn bài trong danh sách rồi bấm Đoán. Đoán sai hoặc Bỏ qua sẽ mở đoạn dài hơn và giảm điểm có thể nhận. Đoán sai ở đoạn cuối hoặc chọn Chịu thua sẽ hiện đáp án.

The rest of the FAQ must preserve: up to five clips depending on song, the score range, guest data loss on tab close, no transfer of guest rounds, the leaderboard's account requirement and time zone, and the no-autoplay behavior. Shorten only where those facts remain clear. Keep music rights and commercial-use answers factual rather than playful.

### Legal terms

The terms page is outside the youth-voice treatment. Its legal statements need an accuracy review before editing. Do not weaken the existing disclosure that the project has no written licenses for its music clips.

### English

English should match the mechanics, not translate Vietnamese tone word for word. Plain English buttons remain “Play”, “Guess”, “Skip”, “Next”. Check the English equivalent whenever a Vietnamese line changes.

### SEO and sharing

Describe the game, not an imagined cultural moment: “Nghe đoạn nhạc và đoán tên bài hát Việt. Đoán càng sớm, điểm càng cao.” Share text should show difficulty, result and score without revealing the title. Keep the existing private-site `noindex` decision separate from this copy review.

## 6. How to review this with Vietnamese players

The next step is a short **native-speaker copy test**, not more desk research dressed up as certainty. Show the actual mobile screen and ask several Vietnamese players, ideally from different regions and ages:

1. Which line sounds like something an app would naturally say? Which one sounds written by a brand or a bot?
2. What do you expect **Bỏ qua** to do? Do you notice its point cost?
3. Does **Bài gì đây?** feel normal in this game, or would you leave the existing question?
4. How should a win and a give-up be shown with the fewest words?
5. Does **Thử lại** suggest the same song? What would you call the new-song action?

Record exact objections, not just preference votes. Reject any line that implies wrong mechanics or needs an explanation to sound natural. Then make one copy pass in Vietnamese and one corresponding English pass. Review the rendered UI at phone width, at 200% zoom, and with the screen-reader announcements. Keep placeholders accurate, especially `{seconds}`, `{points}` and `{at}`.
