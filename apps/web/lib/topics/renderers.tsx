import type { ComponentType } from 'react';
import type { Song } from '@wts/topic-songs';
import type { TopicId } from '@wts/topics';
import { Game } from '@/app/components/Game';

/** UI stays in the web app; each registered Topic gets one renderer here. */
function SongsRenderer({ catalogue, topicId }: { catalogue: Song[]; topicId: TopicId }) {
  return <Game catalogue={catalogue} topicId={topicId} />;
}

export const renderers = {
  songs: SongsRenderer,
} satisfies Record<TopicId, ComponentType<{ catalogue: Song[]; topicId: TopicId }>>;
