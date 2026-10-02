import type { Lang } from '@/lib/i18n/detect';
import { renderers, type RenderableTopicId } from './renderers';

/** Registry insertion order is the order of the home page. */
export const renderableTopicIds = Object.keys(renderers) as RenderableTopicId[];

type Localised = Record<Lang, string>;

export const topicMeta = {
  songs: {
    name: { vi: 'Bài hát', en: 'Songs' },
    clue: { vi: 'Nghe đoạn nhạc ngắn', en: 'Hear a short clip' },
    blurb: {
      vi: 'Nghe một đoạn nhạc rồi đoán tên bài hát Việt. Đoán càng sớm, điểm càng cao.',
      en: 'Hear a short clip and guess the Vietnamese song. The earlier you guess, the more you score.',
    },
    burst: ['VIET', 'HITS'],
  },
  food: {
    name: { vi: 'Món ăn', en: 'Food' },
    clue: { vi: 'Nhìn ảnh phóng to', en: 'Spot a zoomed-in photo' },
    blurb: {
      vi: 'Nhìn ảnh món ăn được thu nhỏ dần rồi đoán tên món Việt.',
      en: 'Watch a photo zoom out and guess the Vietnamese dish.',
    },
    burst: ['VIET', 'FOOD'],
  },
} satisfies Record<
  RenderableTopicId,
  { name: Localised; clue: Localised; blurb: Localised; burst: readonly [string, string] }
>;
