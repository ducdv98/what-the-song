/**
 * UI copy, Vietnamese and English.
 *
 * A plain typed catalogue rather than an i18n library: there are a few dozen
 * strings and no pluralisation rules worth the dependency. The `en` table is
 * typed against the `vi` keys, so a missing translation is a compile error
 * rather than a silent English string leaking into the Vietnamese UI.
 */

import type { Lang } from './detect.ts';

const vi = {
  'app.tagline': 'Đoán bài hát',
  'app.language': 'Ngôn ngữ',

  'stats.streak': 'Chuỗi',
  'stats.best': 'Tốt nhất',
  'stats.played': 'Đã chơi',
  'stats.winRate': 'Thắng',

  'picker.genre': 'Thể loại',
  'picker.difficulty': 'Độ khó',
  'picker.all': 'Tất cả',

  'difficulty.easy': 'Dễ',
  'difficulty.normal': 'Thường',
  'difficulty.hard': 'Khó',
  'difficulty.expert': 'Cực khó',
  'difficulty.easy.gloss': 'Đoạn mở đầu dài hơn, 5 mạng',
  'difficulty.normal.gloss': 'Đoạn ngắn, 3 mạng',
  'difficulty.hard.gloss': 'Đoạn ngắn nhất, 3 mạng',
  'difficulty.expert.gloss': 'Đoạn ngắn nhất, 1 mạng, không được mở thêm',

  'round.guessPlaceholder': 'Tên bài hát… (dấu không bắt buộc)',
  'round.guessLabel': 'Nhập tên bài hát',
  'round.revealMore': 'Mở thêm',
  'round.giveUp': 'Chịu thua',
  'round.next': 'Bài tiếp theo',
  'round.correct': 'Chính xác',
  'round.lost': 'Hết lượt',
  'round.score': '{score} điểm — đoán ra ở {at}',
  'round.revealedTo': 'Đã mở tới {at}',
  'round.segment': 'Đoạn {n}/{total}',
  'round.remaining': 'còn {n} lần mở',
  'round.lastSegment': 'đoạn cuối cùng',
  'round.playLabel': 'Phát đoạn {seconds}',
  'round.livesLabel': 'Còn {n}/{total} mạng',

  'empty.genre': 'Chưa có bài nào trong thể loại này — chọn thể loại khác.',
  'empty.catalogue': 'Thư viện trống.',
  'empty.noPlayable': 'Không có bài nào phát được',
  'empty.incomplete':
    '{n} bài thiếu đoạn nhạc. Chạy lại tools/ingest.py — báo cáo sẽ cho biết bài nào lỗi.',
  'empty.noLibrary': 'Chưa có thư viện đoạn nhạc',
  'empty.buildFirst': 'Hãy tạo thư viện trước, rồi tải lại trang:',
  'error.playFailed': 'Không phát được đoạn nhạc này.',
  'loading': 'Đang tải…',
} as const;

export type MessageKey = keyof typeof vi;

const en: Record<MessageKey, string> = {
  'app.tagline': 'Guess the song',
  'app.language': 'Language',

  'stats.streak': 'Streak',
  'stats.best': 'Best',
  'stats.played': 'Played',
  'stats.winRate': 'Win rate',

  'picker.genre': 'Genre',
  'picker.difficulty': 'Difficulty',
  'picker.all': 'All',

  'difficulty.easy': 'Easy',
  'difficulty.normal': 'Normal',
  'difficulty.hard': 'Hard',
  'difficulty.expert': 'Expert',
  'difficulty.easy.gloss': 'Longer first clue, 5 lives',
  'difficulty.normal.gloss': 'Short first clue, 3 lives',
  'difficulty.hard.gloss': 'Shortest clue, 3 lives',
  'difficulty.expert.gloss': 'Shortest clue, 1 life, no reveals',

  'round.guessPlaceholder': 'Song title… (diacritics optional)',
  'round.guessLabel': 'Enter the song title',
  'round.revealMore': 'Reveal more',
  'round.giveUp': 'Give up',
  'round.next': 'Next song',
  'round.correct': 'Correct',
  'round.lost': 'Out of lives',
  'round.score': '{score} points — guessed at {at}',
  'round.revealedTo': 'Revealed up to {at}',
  'round.segment': 'Clue {n}/{total}',
  'round.remaining': '{n} reveals left',
  'round.lastSegment': 'last clue',
  'round.playLabel': 'Play the {seconds} clue',
  'round.livesLabel': '{n} of {total} lives remaining',

  'empty.genre': 'No songs in this genre yet — pick another.',
  'empty.catalogue': 'The catalogue is empty.',
  'empty.noPlayable': 'No playable songs',
  'empty.incomplete':
    '{n} song(s) have an incomplete clip ladder. Re-run tools/ingest.py — its report says which cuts failed.',
  'empty.noLibrary': 'No clip library found',
  'empty.buildFirst': 'Build one first, then reload:',
  'error.playFailed': 'Could not play that clip.',
  'loading': 'Loading…',
};

const TABLES: Record<Lang, Record<MessageKey, string>> = { vi, en };

/**
 * Look up a message, substituting {placeholders}.
 *
 * Falls back to the Vietnamese string, then to the key itself, so a missing
 * entry degrades to something readable instead of rendering "undefined".
 */
export function translate(
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = TABLES[lang]?.[key] ?? vi[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export { vi as viMessages, en as enMessages };
