/** Player-facing name; code and storage identifiers intentionally keep their old names. */
export const APP_NAME = 'Bạn có tài mà';

export const APP_DESCRIPTION = 'Chọn chủ đề, khám phá gợi ý và đoán đáp án. Đoán càng sớm, điểm càng cao.';

export function socialPreview(siteUrl: string | undefined) {
  // A missing or invalid origin produces text-only cards, never a relative image URL.
  let origin: URL | undefined;
  try {
    if (siteUrl) {
      const parsed = new URL(siteUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') origin = parsed;
    }
  } catch { /* Invalid build configuration: use the safe text-only fallback. */ }
  const image = origin ? new URL('/social-preview.png', origin).href : undefined;
  return { origin, image, card: image ? 'summary_large_image' as const : 'summary' as const };
}
