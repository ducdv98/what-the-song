// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRound, giveUp } from '@wts/core';
import { peopleTopic } from '@wts/topic-people';
import { I18nProvider } from './I18nProvider';
import { ResultCard } from './ResultCard';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, test } from 'vitest';
import { ladderFor, type Person } from '@wts/topic-people';
import { RevealPhoto } from './RevealPhoto';

const person: Person = {
  id: 'test-person', name: 'Test Person', field: 'Ca sĩ', photo: 'portrait.jpg',
  sourceUrl: 'https://example.com/photo',
};
const url = '/assets/people/test-person/portrait.jpg';

function loadImage(image: HTMLImageElement, width: number, height: number) {
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  fireEvent.load(image);
}

afterEach(cleanup);

describe('RevealPhoto', () => {
  test('all five Stages reveal from the top while keeping one image mounted', () => {
    const stages = ladderFor(person);
    assert.deepEqual(stages.map((stage) => stage.fraction), [0.15, 0.35, 0.6, 0.85, 1]);
    const view = render(createElement(RevealPhoto, { reveal: stages[0]!, url }));
    const image = view.getByTestId('reveal-photo-image') as HTMLImageElement;
    loadImage(image, 400, 600);
    stages.forEach((reveal) => {
      view.rerender(createElement(RevealPhoto, { reveal, url }));
      const frame = view.getByTestId('reveal-photo') as HTMLElement;
      assert.equal(view.getByTestId('reveal-photo-image'), image);
      assert.equal(image.src, new URL(url, document.baseURI).href);
      assert.equal(parseFloat(frame.style.aspectRatio), (400 / 600) / reveal.fraction);
      assert.equal(frame.dataset.fraction, String(reveal.fraction));
    });
  });

  test('a Person override sets the visible crop at every Stage and width on one mounted image', () => {
    const fractions = [0.2, 0.4, 0.65, 0.9, 1];
    const stages = ladderFor({ ...person, revealFractions: fractions });
    assert.deepEqual(stages.map((stage) => stage.fraction), fractions);
    const view = render(createElement(RevealPhoto, { reveal: stages[0]!, url }));
    const image = view.getByTestId('reveal-photo-image') as HTMLImageElement;
    loadImage(image, 400, 600);
    stages.forEach((reveal, index) => {
      view.rerender(createElement(RevealPhoto, { reveal, url }));
      const frame = view.getByTestId('reveal-photo') as HTMLElement;
      assert.equal(view.getByTestId('reveal-photo-image'), image);
      assert.equal(frame.dataset.fraction, String(fractions[index]));
      const aspectRatio = parseFloat(frame.style.aspectRatio);
      for (const displayedWidth of [180, 300, 380]) {
        const visibleHeight = displayedWidth / aspectRatio;
        assert.ok(Math.abs(visibleHeight - displayedWidth * (600 / 400) * fractions[index]!) < 0.000001);
      }
    });
  });

  test('visible height scales with displayed width for portrait and landscape photos', () => {
    for (const [photoWidth, photoHeight] of [[400, 600], [600, 400]]) {
      const view = render(createElement(RevealPhoto, { reveal: ladderFor(person)[2]!, url }));
      const frame = view.getByTestId('reveal-photo') as HTMLElement;
      loadImage(view.getByTestId('reveal-photo-image') as HTMLImageElement, photoWidth!, photoHeight!);
      const aspectRatio = parseFloat(frame.style.aspectRatio);
      for (const displayedWidth of [180, 300, 380]) {
        assert.ok(Math.abs(displayedWidth / aspectRatio - displayedWidth * photoHeight! / photoWidth! * 0.6) < 0.000001);
      }
      view.unmount();
    }
  });
});

test('a finished Person Round shows the full photo and no Credit', () => {
  const round = giveUp(createRound(person, peopleTopic.ladder(person)));
  const html = renderToStaticMarkup(createElement(I18nProvider, null,
    createElement(ResultCard, { round, peoplePhotoUrl: url, onNext: () => {} })));
  assert.match(html, /src="\/assets\/people\/test-person\/portrait.jpg"/);
  assert.match(html, /Test Person/);
  assert.doesNotMatch(html, /food-credit|example\.com\/photo|Photo:|Ảnh:/);
});
