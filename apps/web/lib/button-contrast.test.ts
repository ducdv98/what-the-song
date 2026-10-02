import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import postcss, { type AtRule, type Rule } from 'postcss';

const root = process.cwd();
const tokens = postcss.parse(readFileSync(join(root, 'app/tokens.css'), 'utf8'));
const sheet = postcss.parse(readFileSync(join(root, 'app/globals.css'), 'utf8'));
const variables = new Map<string, string>();
tokens.walkDecls((declaration) => {
  variables.set(declaration.prop, declaration.value);
});

function resolve(value: string): string {
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(variables.get(reference[1]) ?? '') : value;
}

function rgb(value: string, underlay: string): number[] {
  if (value === 'transparent') return rgb(underlay, '#ffffff');
  const hex = resolve(value).replace('#', '');
  assert.match(hex, /^[\da-f]{6}([\da-f]{2})?$/i, `Unknown color: ${value}`);
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
  const beneath = underlay === value ? [255, 255, 255] : rgb(underlay, '#ffffff');
  return channels.map((channel, index) => channel * alpha + beneath[index] * (1 - alpha));
}

function luminance(channels: number[]): number {
  const linear = channels.map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: number[], background: number[]): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

type Control = {
  name: string;
  classes: string[];
  selected?: boolean;
  surface: string;
};

const controls: Control[] = [
  { name: 'Guess', classes: ['action-btn', 'action-btn--guess'], surface: '--cream-100' },
  { name: 'Skip', classes: ['action-btn'], surface: '--cream-100' },
  { name: 'Give up', classes: ['action-btn', 'action-btn--giveup'], surface: '--cream-100' },
  { name: 'pill', classes: ['pill'], surface: '--cream-100' },
  { name: 'muted pill', classes: ['pill', 'pill--muted'], surface: '--cream-100' },
  { name: 'outlined pill', classes: ['pill', 'pill--outlined', 'pill--muted'], surface: '--yellow-300' },
  { name: 'accent pill', classes: ['pill', 'pill--accent'], surface: '--cream-100' },
  { name: 'Next', classes: ['pill', 'next-button'], surface: '--cream-100' },
  { name: 'tier chip', classes: ['tier-chip'], surface: '--cream-100' },
  { name: 'selected tier chip', classes: ['tier-chip'], selected: true, surface: '--cream-100' },
  { name: 'icon button', classes: ['icon-btn'], surface: '--cream-100' },
  { name: 'play control', classes: ['play-control'], surface: '--cream-100' },
  { name: 'topic card', classes: ['topic-card'], surface: '--yellow-300' },
];

function styles(control: Control, state: string, canHover = true): Record<string, string> {
  const found = new Map<string, { value: string; weight: number; order: number }>();
  let order = 0;
  sheet.walkRules((rule: Rule) => {
    const media = rule.parent?.type === 'atrule' ? (rule.parent as AtRule).params : '';
    if (media.includes('forced-colors')) return;
    if (media.includes('hover: hover') && !canHover) return;
    for (const selector of rule.selector.split(',')) {
      const classes = [...selector.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
      if (!classes.length || !classes.every((name) => control.classes.includes(name))) continue;
      if (/:hover/.test(selector) && (!state.includes('hover') || !canHover)) continue;
      if (/:focus-visible/.test(selector) && !state.includes('focus')) continue;
      if (/:active/.test(selector) && !state.includes('active')) continue;
      if (/:disabled/.test(selector) && !/:not\(:disabled\)/.test(selector) && !state.startsWith('disabled')) continue;
      if (/:not\(:disabled\)/.test(selector) && state.startsWith('disabled')) continue;
      if (/\[aria-checked/.test(selector) && !control.selected) continue;
      // Only selectors that describe the control itself belong in this cascade.
      if (/\s[.#[]/.test(selector.trim())) continue;
      const weight = classes.length + [...selector.matchAll(/:(?:hover|focus-visible|active|disabled)|\[aria-checked/g)].length;
      rule.walkDecls((declaration) => {
        if (!['color', 'background', 'opacity'].includes(declaration.prop)) return;
        const previous = found.get(declaration.prop);
        if (!previous || weight > previous.weight || (weight === previous.weight && order > previous.order)) {
          found.set(declaration.prop, { value: declaration.value, weight, order });
        }
      });
      order++;
    }
  });
  return Object.fromEntries([...found].map(([key, item]) => [key, item.value]));
}

test('button-like controls keep 4.5:1 text contrast in every state', () => {
  for (const control of controls) {
    for (const state of ['rest', 'hover', 'focus', 'focus-hover', 'active', 'active-hover', 'disabled']) {
      const style = styles(control, state);
      assert.ok(style.color, `${control.name} ${state} has a text color`);
      assert.ok(style.background, `${control.name} ${state} has a background`);
      const surface = resolve(`var(${control.surface})`);
      const background = rgb(style.background, surface);
      const foreground = rgb(style.color, surface);
      assert.ok(contrast(foreground, background) >= 4.5,
        `${control.name} ${state}: ${style.color} on ${style.background} has ${contrast(foreground, background).toFixed(2)}:1 contrast`);
      assert.equal(style.opacity ?? '1', '1', `${control.name} ${state} must not dim readable text`);
      if (state === 'disabled') assert.deepEqual(styles(control, 'disabled-hover'), style,
        `${control.name} must not change on disabled hover`);
      if (state === 'hover') assert.deepEqual(styles(control, 'hover', false), styles(control, 'rest', false),
        `${control.name} must not show sticky hover on touch`);
    }
  }
});

test('hover gives enabled controls a distinct fill', () => {
  for (const control of controls.filter((item) => item.name !== 'topic card')) {
    assert.notEqual(styles(control, 'rest').background, styles(control, 'hover').background,
      `${control.name} should change fill on hover`);
  }
});

test('button hover color rules only apply on hover-capable devices', () => {
  sheet.walkRules((rule) => {
    if (!rule.selector.includes(':hover')) return;
    if (!controls.some((control) => control.classes.some((name) => rule.selector.includes(`.${name}:hover`)))) return;
    assert.match(rule.parent?.type === 'atrule' ? (rule.parent as AtRule).params : '', /hover: hover/,
      `${rule.selector} must be inside a hover media query`);
  });
});
