// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Person } from '@wts/topic-people';
import { I18nProvider } from './I18nProvider';
import { PeopleGame } from './PeopleGame';
import { MenuProvider } from './GameMenu';

const recorded = vi.hoisted(() => vi.fn());
const history = vi.hoisted(() => ({ played: 1, guest: true }));
vi.mock('@/lib/assets/urls', () => ({ assetUrls: { resolve: vi.fn(async (path: string) => path) } }));
vi.mock('@/lib/assets/memes', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/assets/memes')>(),
  prepareRoundAssets: vi.fn(async () => ({ won: null, lost: null })),
}));
vi.mock('./useStats', () => ({ useStats: () => ({
  stats: { played: 0, won: 0, lost: 0, currentStreak: 0, bestStreak: 0 },
  record: recorded, syncFailed: false, synced: 0, topicPlayed: history.played, userId: history.guest ? null : 'player-1',
}) }));
vi.mock('./Leaderboard', () => ({ Leaderboard: () => null }));
vi.mock('./StreakBar', () => ({ StreakBar: () => null }));

afterEach(() => { cleanup(); recorded.mockClear(); localStorage.clear(); history.played = 1; history.guest = true; });

const person: Person = {
  id: 'test-person', name: 'Ca Sĩ Test', aliases: ['Test Singer'], field: 'Ca sĩ',
  tier: 'easy', photo: 'portrait.jpg', sourceUrl: 'https://example.com/source',
};

test('a guest gets three middle-Stage Warm-up Rounds and resumes at the next Round after reload', async () => {
  history.played = 0;
  const view = render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua|give up/i }));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua luôn|give up for good/i }));
  assert.equal(recorded.mock.calls.length, 1);
  assert.equal(recorded.mock.calls[0]?.[0]?.score, 0);
  view.unmount();

  render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getByRole('button', { name: /bỏ qua|give up/i }));
    fireEvent.click(screen.getByRole('button', { name: /bỏ qua luôn|give up for good/i }));
    fireEvent.click(screen.getByRole('button', { name: /next|tiếp|again|lại/i }));
  }
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.15'));
});

test('a signed-in player resumes an unfinished Warm-up after the server records its first Round', async () => {
  history.played = 0;
  history.guest = false;
  const view = render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua|give up/i }));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua luôn|give up for good/i }));
  assert.equal(recorded.mock.calls.length, 1);
  view.unmount();

  history.played = 1;
  render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
});

test('Reveal more opens the next Stage; a matching Guess records the People Score and shows no Credit', async () => {
  render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.ok(screen.getByRole('textbox')));
  assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.15');
  fireEvent.click(screen.getByRole('button', { name: /reveal more|gợi ý thêm/i }));
  assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.35');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test Singer' } });
  fireEvent.click(screen.getByRole('button', { name: /guess|đoán/i }));
  const result = screen.getByTestId('result');
  assert.equal(result.getAttribute('data-status'), 'won');
  assert.match(result.textContent ?? '', /Ca Sĩ Test/);
  assert.equal(result.querySelector('.food-credit'), null);
  assert.equal(result.querySelector('img')?.getAttribute('src'), '/assets/people/test-person/portrait.jpg');
  assert.equal(recorded.mock.calls.length, 1);
  assert.equal(recorded.mock.calls[0]?.[0]?.topic, 'people');
  assert.equal(recorded.mock.calls[0]?.[0]?.subjectId, 'test-person');
  assert.equal(recorded.mock.calls[0]?.[0]?.facet, 'ca-si');
  assert.equal(recorded.mock.calls[0]?.[0]?.won, true);
  assert.ok(recorded.mock.calls[0]?.[0]?.score > 0);
});

test('the Field Facet filters People with Vietnamese and English labels', async () => {
  localStorage.setItem('what-the-song:lang:v1', 'en');
  const actor: Person = { ...person, id: 'actor', name: 'Actor Test', aliases: [], field: 'Diễn viên' };
  render(<I18nProvider><MenuProvider><PeopleGame catalogue={[person, actor]} /></MenuProvider></I18nProvider>);
  await waitFor(() => assert.ok(screen.getByRole('textbox')));
  assert.ok(screen.getByRole('radiogroup', { name: 'Field', hidden: true }));
  fireEvent.click(screen.getByRole('radio', { name: /Actor/, hidden: true }));
  await waitFor(() => assert.match(document.body.textContent ?? '', /Field: Actor/));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Actor Test' } });
  fireEvent.click(screen.getByRole('button', { name: /guess/i }));
  assert.equal(recorded.mock.calls[0]?.[0]?.subjectId, 'actor');
  assert.equal(recorded.mock.calls[0]?.[0]?.facet, 'dien-vien');
});

test('Warm-up uses Topic-wide easy People when the selected Field has only medium People', async () => {
  history.played = 0;
  localStorage.setItem('what-the-song:lang:v1', 'en');
  const singers = Array.from({ length: 10 }, (_, index): Person => ({ ...person, id: `singer-${index}` }));
  const actor: Person = { ...person, id: 'actor', name: 'Actor Test', field: 'Diễn viên', tier: 'medium' };
  render(<I18nProvider><MenuProvider><PeopleGame catalogue={[...singers, actor]} /></MenuProvider></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
  fireEvent.click(screen.getByRole('radio', { name: /Actor/, hidden: true }));
  await waitFor(() => assert.equal(screen.getByTestId('reveal-photo').getAttribute('data-fraction'), '0.6'));
  fireEvent.click(screen.getByRole('button', { name: /give up/i }));
  fireEvent.click(screen.getByRole('button', { name: /give up for good/i }));
  assert.match(recorded.mock.calls[0]?.[0]?.subjectId ?? '', /^singer-/);
  assert.equal(recorded.mock.calls[0]?.[0]?.difficulty, 'easy');
});

test('Give up on the first People Stage ends the Round and shows the Person', async () => {
  render(<I18nProvider><PeopleGame catalogue={[person]} /></I18nProvider>);
  await waitFor(() => assert.ok(screen.getByRole('textbox')));
  assert.ok(screen.getByRole('button', { name: /gợi ý thêm|reveal more/i }));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua|give up/i }));
  fireEvent.click(screen.getByRole('button', { name: /bỏ qua luôn|give up for good/i }));
  const result = screen.getByTestId('result');
  assert.equal(result.getAttribute('data-status'), 'lost');
  assert.match(result.textContent ?? '', /Ca Sĩ Test/);
  assert.match(result.textContent ?? '', /0 điểm|0 points/);
  assert.equal(recorded.mock.calls[0]?.[0]?.won, false);
});
