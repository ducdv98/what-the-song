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

  'stats.guestNote': 'Bạn đang chơi với tư cách khách — thống kê sẽ mất khi đóng tab. Đăng nhập để lưu lại.',
  'stats.savedNote': 'Đã lưu vào tài khoản {name}.',
  'stats.syncFailed': 'Không lưu được ván vừa rồi.',

  'auth.signIn': 'Đăng nhập',
  'auth.register': 'Đăng ký',
  'auth.createAccount': 'Tạo tài khoản',
  'auth.signOut': 'Đăng xuất',
  'auth.close': 'Đóng',
  'auth.title': 'Tài khoản',
  'auth.why': 'Khách vẫn chơi thoải mái. Có tài khoản thì chuỗi thắng và điểm được lưu lại.',
  'auth.identifier': 'Tên đăng nhập hoặc email',
  'auth.username': 'Tên đăng nhập',
  'auth.email': 'Email',
  'auth.password': 'Mật khẩu',
  'auth.usernameHint': '3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới',
  'auth.passwordHint': 'Ít nhất 8 ký tự',
  'auth.working': 'Đang xử lý…',
  'auth.error.invalid_username': 'Tên đăng nhập cần 3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.',
  'auth.error.invalid_email': 'Email không hợp lệ.',
  'auth.error.invalid_password': 'Mật khẩu cần từ 8 đến 128 ký tự.',
  'auth.error.username_taken': 'Tên đăng nhập này đã có người dùng.',
  'auth.error.email_taken': 'Email này đã được đăng ký.',
  'auth.error.invalid_credentials': 'Sai tên đăng nhập, email hoặc mật khẩu.',
  'auth.error.rate_limited': 'Thử quá nhiều lần. Hãy đợi vài phút rồi thử lại.',
  'auth.error.unauthenticated': 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  'auth.error.unavailable': 'Không kết nối được máy chủ tài khoản.',
  'auth.error.server_error': 'Máy chủ gặp lỗi. Hãy thử lại sau.',

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

  'stats.guestNote': 'Playing as a guest — these stats are gone when you close the tab. Sign in to keep them.',
  'stats.savedNote': 'Saved to {name}’s account.',
  'stats.syncFailed': 'Could not save the last round.',

  'auth.signIn': 'Sign in',
  'auth.register': 'Register',
  'auth.createAccount': 'Create account',
  'auth.signOut': 'Sign out',
  'auth.close': 'Close',
  'auth.title': 'Account',
  'auth.why': 'Guests play freely. With an account, your streaks and scores are kept.',
  'auth.identifier': 'Username or email',
  'auth.username': 'Username',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.usernameHint': '3–20 characters: letters, digits or underscore',
  'auth.passwordHint': 'At least 8 characters',
  'auth.working': 'Working…',
  'auth.error.invalid_username': 'Usernames are 3–20 characters: letters without accents, digits or underscore.',
  'auth.error.invalid_email': 'That email address is not valid.',
  'auth.error.invalid_password': 'Passwords are 8 to 128 characters.',
  'auth.error.username_taken': 'That username is taken.',
  'auth.error.email_taken': 'That email is already registered.',
  'auth.error.invalid_credentials': 'Wrong username, email or password.',
  'auth.error.rate_limited': 'Too many attempts. Wait a few minutes and try again.',
  'auth.error.unauthenticated': 'Your session expired. Please sign in again.',
  'auth.error.unavailable': 'Could not reach the account server.',
  'auth.error.server_error': 'The server hit an error. Try again later.',

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
