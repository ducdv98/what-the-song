'use client';

import Link from 'next/link';
import { renderableTopicIds, topicMeta } from '@/lib/topics/meta';
import type { RenderableTopicId } from '@/lib/topics/renderers';
import { useI18n } from './I18nProvider';

export function TopicSwitcher({
  topicId,
  topicIds = renderableTopicIds,
}: {
  topicId: RenderableTopicId;
  topicIds?: readonly RenderableTopicId[];
}) {
  const { lang, t } = useI18n();
  if (topicIds.length < 2) return null;

  return (
    <nav className="topic-switcher" aria-label={t('topic.navigation')}>
      <div className="topic-switcher__row">
        {topicIds.map((id) => (
          <Link
            key={id}
            className={`pill topic-switcher__link${id === topicId ? ' pill--accent' : ' pill--muted'}`}
            href={`/${id}`}
            aria-current={id === topicId ? 'page' : undefined}
          >
            {topicMeta[id][lang]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
