import type { Song } from '@wts/topic-songs';
import type { Dish } from '@wts/topic-food';
import { Game } from '@/app/components/Game';
import { FoodGame } from '@/app/components/FoodGame';

/** UI stays in the web app; routes are generated for Topics with a renderer. */
function SongsRenderer({ catalogue, topicId }: { catalogue: Song[]; topicId: 'songs' }) {
  return <Game catalogue={catalogue} topicId={topicId} />;
}

function FoodRenderer({ catalogue }: { catalogue: Dish[]; topicId: 'food' }) {
  return <FoodGame catalogue={catalogue} />;
}

export const renderers = {
  songs: SongsRenderer,
  food: FoodRenderer,
};

export type RenderableTopicId = keyof typeof renderers;

export function isRenderableTopicId(id: string): id is RenderableTopicId {
  return Object.hasOwn(renderers, id);
}
