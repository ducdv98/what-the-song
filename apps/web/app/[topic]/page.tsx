import { notFound } from 'next/navigation';
import { isTopicId } from '@wts/topics';
import { isRenderableTopicId, renderers } from '@/lib/topics/renderers';
import { TopicPage } from './TopicPage';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(renderers).map((topic) => ({ topic }));
}

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  if (!isTopicId(topicId) || !isRenderableTopicId(topicId)) notFound();

  return <TopicPage topicId={topicId} />;
}
