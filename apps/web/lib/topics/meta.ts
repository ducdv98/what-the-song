import type { Lang } from '@/lib/i18n/detect';
import { renderers, type RenderableTopicId } from './renderers';

/** Registry insertion order is the switcher order. */
export const renderableTopicIds = Object.keys(renderers) as RenderableTopicId[];

export const topicMeta = {
  songs: { vi: 'Bài hát', en: 'Songs' },
  food: { vi: 'Món ăn', en: 'Food' },
} satisfies Record<RenderableTopicId, Record<Lang, string>>;
