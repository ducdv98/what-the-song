import type { Song } from '@wts/topic-songs';
import type { Dish } from '@wts/topic-food';
import type { Person } from '@wts/topic-people';
import { Game } from '@/app/components/Game';
import { FoodGame } from '@/app/components/FoodGame';
import { PeopleGame } from '@/app/components/PeopleGame';

/** UI stays in the web app; routes are generated for Topics with a renderer. */
function SongsRenderer({ catalogue, topicId }: { catalogue: Song[]; topicId: 'songs' }) {
  return <Game catalogue={catalogue} topicId={topicId} />;
}

function FoodRenderer({ catalogue }: { catalogue: Dish[]; topicId: 'food' }) {
  return <FoodGame catalogue={catalogue} />;
}

function PeopleRenderer({ catalogue }: { catalogue: Person[]; topicId: 'people' }) {
  return <PeopleGame catalogue={catalogue} />;
}

export const renderers = {
  songs: SongsRenderer,
  food: FoodRenderer,
  people: PeopleRenderer,
};

export type RenderableTopicId = keyof typeof renderers;

export function isRenderableTopicId(id: string): id is RenderableTopicId {
  return Object.hasOwn(renderers, id);
}
