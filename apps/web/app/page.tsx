import { DEFAULT_TOPIC_ID } from '@wts/topics';
import { HomeRedirect } from './HomeRedirect';

export default function Page() {
  const destination = `/${DEFAULT_TOPIC_ID}`;

  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${destination}`} />
      <HomeRedirect destination={destination} />
    </>
  );
}
