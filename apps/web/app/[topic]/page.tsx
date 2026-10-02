import { notFound } from 'next/navigation';
import { isTopicId } from '@wts/topics';
import { isRenderableTopicId, renderers } from '@/lib/topics/renderers';
import { TopicPage } from './TopicPage';
import type { Metadata } from 'next';
import { topicMeta } from '@/lib/topics/meta';
import { APP_NAME, socialPreview } from '@/lib/brand';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(renderers).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  if (!isRenderableTopicId(topic)) notFound();
  const meta = topicMeta[topic];
  const title = `${meta.name.vi} · ${APP_NAME}`;
  const preview = socialPreview(process.env.SITE_URL);
  return {
    title: meta.name.vi,
    description: meta.blurb.vi,
    openGraph: {
      type: 'website', siteName: APP_NAME, title, description: meta.blurb.vi, locale: 'vi_VN',
      images: preview.image ? [{ url: preview.image, width: 1200, height: 630, alt: `${APP_NAME} · Trò chơi đoán nhiều chủ đề` }] : undefined,
    },
    twitter: { card: preview.card, title, description: meta.blurb.vi, images: preview.image ? [preview.image] : undefined },
  };
}

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  if (!isTopicId(topicId) || !isRenderableTopicId(topicId)) notFound();

  return <TopicPage topicId={topicId} />;
}
