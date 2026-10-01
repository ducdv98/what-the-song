import { notFound } from 'next/navigation';
import { getTopic, isTopicId, TOPIC_IDS } from '@wts/topics';
import { TopicPage } from './TopicPage';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPIC_IDS.map((topic) => ({ topic }));
}

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  if (!isTopicId(topicId)) notFound();
  const topic = getTopic(topicId);
  if (!topic) notFound();

  return <TopicPage topicId={topicId} />;
}
