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

  'stats.guestNote': 'Khách — thống kê chỉ giữ đến khi đóng tab.',
  'stats.savedNote': 'Đã lưu vào tài khoản {name}.',
  'stats.syncFailed': 'Không lưu được ván vừa rồi.',
  'board.title': 'Bảng xếp hạng',
  'board.period': 'Khoảng thời gian',
  'board.when': 'Thời điểm',
  'board.week': 'Tuần',
  'board.month': 'Tháng',
  'board.current': 'Hiện tại',
  'board.previous': 'Trước',
  'board.loading': 'Đang tải…',
  'board.empty': 'Chưa có ai ghi điểm trong khoảng này.',
  'board.unavailable': 'Không tải được bảng xếp hạng.',
  'board.points': '{n} điểm',
  'board.detail': '{rounds} bài · {wins} đúng',
  'board.you': 'bạn',
  'board.guest': 'Chỉ người chơi có tài khoản mới được lên bảng xếp hạng.',

  'guest.title': 'Bạn đang chơi với tư cách khách',
  'guest.body':
    'Cứ chơi thoải mái, không cần tài khoản. Nhưng chuỗi thắng và điểm của khách sẽ mất khi bạn đóng tab. Đăng nhập hoặc tạo tài khoản để lưu lại thành tích của bạn — và góp mặt trên bảng xếp hạng sau này.',
  'guest.offline': 'Hiện không kết nối được máy chủ tài khoản — bạn vẫn chơi được với tư cách khách.',
  'guest.later': 'Để sau',

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

  'difficulty.empty': 'Chưa có bài nào ở độ khó này — gắn "tier" cho bài trong seed.',

  'round.guessPlaceholder': 'Tên bài hát…',
  'round.guessLabel': 'Nhập tên bài hát',
  'round.skip': 'Bỏ qua',
  'round.guess': 'Đoán',
  'round.giveUp': 'Chịu thua',
  'round.playLabel': 'Phát đoạn {seconds}',
  'round.stopLabel': 'Dừng',
  'round.timeline': 'Đã mở {at} trên {max}',

  'result.itWas': 'Đó là_',
  'result.guessedIn': 'Đoán đúng ở {at}!',
  'result.lost': 'Thua!',
  'result.next': 'Bài tiếp',
  'result.tryAgain': 'Thử lại',
  'result.share': 'Chia sẻ',
  'result.copied': 'Đã chép!',
  'result.listen': 'Nghe {seconds}',
  'result.shareText': 'what the song · {tier}\n{squares} {outcome}',
  'result.shareWon': 'đoán ra ở {at}',
  'result.shareLost': 'chịu thua',

  'menu.open': 'Mở menu',
  'menu.close': 'Đóng menu',
  'menu.title': 'Cài đặt & thống kê',
  'menu.howTo': 'Cách chơi',
  'menu.howToBody':
    'Nghe đoạn nhạc ngắn nhất (0.1 giây) rồi đoán tên bài. Đoán sai hoặc bỏ qua sẽ mở đoạn dài hơn: 0.1s → 0.5s → 2s → 8s → 16s. Đoán càng sớm càng giỏi.',

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

  'stats.guestNote': 'Guest — these stats last until you close the tab.',
  'stats.savedNote': 'Saved to {name}’s account.',
  'stats.syncFailed': 'Could not save the last round.',
  'board.title': 'Leaderboard',
  'board.period': 'Period',
  'board.when': 'When',
  'board.week': 'Week',
  'board.month': 'Month',
  'board.current': 'Current',
  'board.previous': 'Previous',
  'board.loading': 'Loading…',
  'board.empty': 'Nobody has scored in this period yet.',
  'board.unavailable': 'Could not load the leaderboard.',
  'board.points': '{n} pts',
  'board.detail': '{rounds} played · {wins} won',
  'board.you': 'you',
  'board.guest': 'Only players with an account appear on the leaderboard.',

  'guest.title': "You're playing as a guest",
  'guest.body':
    "Play freely — no account needed. But a guest's streaks and scores are lost when you close this tab. Sign in or create an account to keep your record, and to be on the leaderboard later.",
  'guest.offline': "The account server can't be reached right now — you can still play as a guest.",
  'guest.later': 'Not now',

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

  'difficulty.empty': 'No songs at this difficulty yet — tag songs with a "tier" in the seed file.',

  'round.guessPlaceholder': 'Name that track',
  'round.guessLabel': 'Enter the song title',
  'round.skip': 'Skip',
  'round.guess': 'Guess',
  'round.giveUp': 'Give up',
  'round.playLabel': 'Play the {seconds} clip',
  'round.stopLabel': 'Stop',
  'round.timeline': '{at} unlocked of {max}',

  'result.itWas': 'It was_',
  'result.guessedIn': 'Guessed in {at}!',
  'result.lost': 'Lost!',
  'result.next': 'Next',
  'result.tryAgain': 'Try again',
  'result.share': 'Share',
  'result.copied': 'Copied!',
  'result.listen': 'Hear {seconds}',
  'result.shareText': 'what the song · {tier}\n{squares} {outcome}',
  'result.shareWon': 'guessed in {at}',
  'result.shareLost': 'gave up',

  'menu.open': 'Open menu',
  'menu.close': 'Close menu',
  'menu.title': 'Settings & stats',
  'menu.howTo': 'How to play',
  'menu.howToBody':
    'Hear the shortest clip (0.1 seconds) and name the song. A wrong guess or a skip unlocks a longer clip: 0.1s → 0.5s → 2s → 8s → 16s. The earlier you get it, the better.',

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
