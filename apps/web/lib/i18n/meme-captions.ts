/** Random Meme dialog headings. Vietnamese slang in both UI languages; a meme has no translation. */
const WON = [
  'Ổn không ní?',
  'Dễ ẹc à',
  'Quá đỉnh luôn ní',
  'Chưa tày đâu, còn nhiều ván nữa',
  'Hay dữ ta',
  'Ai cho ní giỏi vậy?',
] as const;

const LOST = [
  'Chưa tày đâu',
  'Dễ thế mà không biết',
  'Giỡn quài ní',
  'Ổn không ní?',
  'Trời ơi tin được không',
  'Thôi xong rồi ní ơi',
] as const;

export function pickMemeCaption(status: 'won' | 'lost', random: () => number = Math.random): string {
  const pool = status === 'won' ? WON : LOST;
  return pool[Math.floor(random() * pool.length)];
}
