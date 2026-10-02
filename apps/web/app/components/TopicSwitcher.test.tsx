import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';
import { renderers, type RenderableTopicId } from '@/lib/topics/renderers';
import { renderableTopicIds, topicMeta } from '@/lib/topics/meta';
import { I18nProvider } from './I18nProvider';
import { TopicSwitcher } from './TopicSwitcher';

function render(topicId: RenderableTopicId, topicIds?: readonly RenderableTopicId[]) {
  return renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(TopicSwitcher, { topicId, topicIds })));
}

describe('TopicSwitcher', () => {
  test('lists every renderer in registry order with its Topic route', () => {
    const ids = Object.keys(renderers) as RenderableTopicId[];
    const html = render(ids[0]);
    assert.deepEqual(renderableTopicIds, ids);
    assert.match(html, /<nav\b[^>]*aria-label="Chọn chủ đề"/);
    assert.equal((html.match(/<a\b/g) ?? []).length, ids.length);
    assert.deepEqual([...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]),
      ids.map((id) => `/${id}`));
    for (const id of ids) assert.match(html, new RegExp(`>${topicMeta[id].vi}</a>`));
  });

  test('marks only the current Topic as the page', () => {
    const html = render('food');
    const currentLink = [...html.matchAll(/<a\b[^>]*>/g)]
      .map((match) => match[0])
      .find((tag) => tag.includes('href="/food"'));
    assert.match(currentLink ?? '', /aria-current="page"/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  });

  test('renders nothing when only one Topic has a renderer', () => {
    assert.equal(render('songs', ['songs']), '');
  });

  test('metadata covers exactly the renderer registry, in both languages', () => {
    assert.deepEqual(Object.keys(topicMeta).sort(), Object.keys(renderers).sort());
    for (const id of renderableTopicIds) {
      assert.ok(topicMeta[id].vi);
      assert.ok(topicMeta[id].en);
    }
  });
});
