import { songsTopic } from '@wts/topic-songs';

/** Add each Topic package here; apps consume this shared registry. */
export const topics = {
  songs: songsTopic,
} as const;

export type TopicId = keyof typeof topics;
export const DEFAULT_TOPIC_ID: TopicId = 'songs';
export const TOPIC_IDS: readonly TopicId[] = Object.keys(topics) as TopicId[];

export function isTopicId(id: string): id is TopicId {
  return Object.hasOwn(topics, id);
}

export function getTopic(id: string): (typeof topics)[TopicId] | undefined {
  return isTopicId(id) ? topics[id] : undefined;
}
