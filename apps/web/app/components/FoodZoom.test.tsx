import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';
import { createRound, giveUp, skip, submitGuess } from '@wts/core';
import { foodTopic, ladderFor, matchGuess, validateCatalogue } from '@wts/topic-food';
import fixture from '../../test/fixtures/food-catalogue.json';
import { FoodZoom } from './FoodZoom';
import { ResultCard } from './ResultCard';
import { I18nProvider } from './I18nProvider';

const [focalDish, centredDish] = validateCatalogue(fixture);
const photoUrl = '/assets/food/pho/pho.jpg';

function visibleBlur(html: string, displayedWidth: number): number {
  const blur = /blur\(([\d.]+)(px|cqw)\)/.exec(html);
  const scale = /scale\(([\d.]+)\)/.exec(html);
  assert.ok(blur && scale, 'the photo has blur and a crop scale');
  const radius = Number(blur[1]) * (blur[2] === 'cqw' ? displayedWidth / 100 : 1);
  return radius * Number(scale[1]);
}

describe('Food Zoom components', () => {
  test('each Stage sets the CSS crop and the final Stage shows the whole photo', () => {
    const expected = [4, 2.5, 5 / 3, 1.25, 1];
    ladderFor(centredDish).forEach((zoom, index) => {
      const html = renderToStaticMarkup(createElement(FoodZoom, { zoom, url: photoUrl }));
      assert.match(html, new RegExp(`data-fraction="${zoom.fraction}"`));
      assert.match(html, new RegExp(`scale\\(${expected[index]}\\)`));
      assert.match(html, /translate\(0%, 0%\)/);
      assert.equal((html.match(/<img\b/g) ?? []).length, 1);
      assert.match(html, /src="\/assets\/food\/pho\/pho.jpg"/);
    });
  });

  test('a Dish focal point moves the crop, including a complete final image', () => {
    const stages = ladderFor(focalDish);
    const first = renderToStaticMarkup(createElement(FoodZoom, { zoom: stages[0], url: photoUrl }));
    const last = renderToStaticMarkup(createElement(FoodZoom, { zoom: stages[4], url: photoUrl }));
    assert.match(first, /translate\(-(?:79\.99999999999999|80)%, 80%\) scale\(4\)/);
    assert.match(last, /translate\(0%, 0%\) scale\(1\)/);
  });

  test('the same Obscuring level has the same relative visible blur at every crop and width', () => {
    const stages = ladderFor(centredDish).slice(0, 4).map((zoom) => ({ ...zoom, obscuring: 0.5 }));
    const rendered = stages.map((zoom) =>
      renderToStaticMarkup(createElement(FoodZoom, { zoom, url: photoUrl })));
    const expectedRelativeBlur = visibleBlur(rendered[0]!, 380) / 380;
    for (const displayedWidth of [180, 300, 380]) {
      const relativeBlur = rendered.map((html) => visibleBlur(html, displayedWidth) / displayedWidth);
      for (const blur of relativeBlur) {
        assert.ok(Math.abs(blur - expectedRelativeBlur) < 0.000001);
      }
    }
  });

  test('each Stage shows a sharper, more colourful photo until fully clear', () => {
    const stages = ladderFor(centredDish);
    const effects = stages.map((zoom) => {
      const html = renderToStaticMarkup(createElement(FoodZoom, { zoom, url: photoUrl }));
      const grayscale = /grayscale\(([\d.]+)\)/.exec(html);
      return { html, blur: zoom.obscuring > 0 ? visibleBlur(html, 380) : 0,
        grayscale: grayscale ? Number(grayscale[1]) : 0 };
    });
    assert.ok(effects[0]!.blur > 0);
    assert.ok(effects[0]!.grayscale > 0);
    for (let index = 1; index < effects.length; index++) {
      assert.ok(effects[index]!.blur < effects[index - 1]!.blur);
      assert.ok(effects[index]!.grayscale < effects[index - 1]!.grayscale);
    }
    assert.doesNotMatch(effects.at(-1)!.html, /blur\(|grayscale\(/);
    assert.doesNotMatch(effects.at(-1)!.html, /filter:/);
  });

  test('a finished Round shows its photo clear after an early win', () => {
    const round = submitGuess(createRound(focalDish, foodTopic.ladder(focalDish)), 'bun bo hue',
      (text, dish) => matchGuess(text, dish) ? 'exact' : 'none');
    assert.equal(round.status, 'won');
    const html = renderToStaticMarkup(createElement(I18nProvider, null,
      createElement(ResultCard, { round, foodPhotoUrl: photoUrl, onNext: () => {} })));
    assert.match(html, /class="result-cover result-food-photo"/);
    assert.doesNotMatch(html, /blur\(|grayscale\(/);
  });

  test('Credit renders author, licence and source link', () => {
    const round = giveUp(createRound(focalDish, foodTopic.ladder(focalDish)));
    const html = renderToStaticMarkup(createElement(I18nProvider, null,
      createElement(ResultCard, { round, foodPhotoUrl: photoUrl, onNext: () => {} })));
    assert.match(html, /Fixture Photographer/);
    assert.match(html, /CC BY-SA 4\.0/);
    assert.match(html, /href="https:\/\/commons.wikimedia.org\/wiki\/File:Bun_bo_Hue.jpg"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /data-status="lost"/);
    assert.match(html, /Bún bò Huế/);
    assert.doesNotMatch(html, /blur\(|grayscale\(/);
  });
});

describe('fixture catalogue', () => {
  test('can be won or lost across the five Stages', () => {
    const matcher = (text: string, dish: typeof focalDish) => matchGuess(text, dish) ? 'exact' as const : 'none' as const;
    let won = createRound(focalDish, foodTopic.ladder(focalDish));
    for (let i = 0; i < 4; i++) won = skip(won);
    assert.equal(won.stageIndex, 4);
    won = submitGuess(won, 'bun bo hue', matcher);
    assert.equal(won.status, 'won');
    assert.equal(won.attempts.length, 5);

    let lost = createRound(centredDish, foodTopic.ladder(centredDish));
    for (let i = 0; i < 4; i++) lost = skip(lost);
    lost = giveUp(lost);
    assert.equal(lost.status, 'lost');
    assert.equal(lost.stageIndex, 4);
  });
});
