import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';
import { renderers, type RenderableTopicId } from '@/lib/topics/renderers';
import { renderableTopicIds, topicMeta } from '@/lib/topics/meta';
import { AuthProvider } from './components/AuthProvider';
import { I18nProvider } from './components/I18nProvider';
import { HomePage } from './HomePage';

function render(topicIds?: readonly RenderableTopicId[]) {
  return renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(AuthProvider, null, createElement(HomePage, { topicIds }))));
}

describe('HomePage', () => {
  test('links every renderer in registry order to its Topic route', () => {
    const ids = Object.keys(renderers) as RenderableTopicId[];
    const html = render();
    assert.deepEqual(renderableTopicIds, ids);
    const hrefs = [...html.matchAll(/<a\b[^>]*class="topic-card"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ids.map((id) => `/${id}`));
    for (const id of ids) assert.match(html, new RegExp(`>${topicMeta[id].name.vi}</h2>`));
  });

  test('metadata covers exactly the renderer registry, in both languages', () => {
    assert.deepEqual(Object.keys(topicMeta).sort(), Object.keys(renderers).sort());
    for (const id of renderableTopicIds) {
      for (const lang of ['vi', 'en'] as const) {
        assert.ok(topicMeta[id].name[lang]);
        assert.ok(topicMeta[id].clue[lang]);
        assert.ok(topicMeta[id].blurb[lang]);
      }
    }
  });
});
