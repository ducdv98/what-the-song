// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Song } from '@wts/topic-songs';
import { validateCatalogue } from '@wts/topic-food';
import fixture from '../../test/fixtures/food-catalogue.json';
import { Game } from './Game';
import { FoodGame } from './FoodGame';
import { I18nProvider } from './I18nProvider';

const selected = vi.hoisted(() => ({ available: true }));
vi.mock('@/lib/assets/memes', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/assets/memes')>();
  return {
    ...original,
    prepareRoundAssets: vi.fn(async (_paths: string[], enabled: boolean) => ({
      won: enabled && selected.available ? { file: 'aaaaaaaaaaaaaaaaaaaaaaaa.webp', outcome: 'won', source: 'fixture' } : null,
      lost: enabled && selected.available ? { file: 'bbbbbbbbbbbbbbbbbbbbbbbb.webp', outcome: 'lost', source: 'fixture' } : null,
    })),
  };
});
vi.mock('@/lib/assets/urls', () => ({ assetUrls: { resolve: vi.fn(async (path: string, force?: boolean) => force ? `${path}?retry=1` : path) } }));
vi.mock('./useStats', () => ({ useStats: () => ({
  stats: { played: 0, won: 0, lost: 0, currentStreak: 0, bestStreak: 0 },
  record: vi.fn(), syncFailed: false, synced: 0,
}) }));
vi.mock('./useAudioEngine', () => {
  const engine = { stop: vi.fn(), progress: () => 0, prefetch: vi.fn(), play: vi.fn() };
  return { useAudioEngine: () => ({ engine, state: 'idle' }) };
});
vi.mock('./Leaderboard', () => ({ Leaderboard: () => null }));
vi.mock('./StreakBar', () => ({ StreakBar: () => null }));

const songs: Song[] = [
  { id: 'one', title: 'Nơi Này Có Anh', artist: 'A', clips: { '100': 'a.mp3' } },
  { id: 'two', title: 'Chạy Ngay Đi', artist: 'B', clips: { '100': 'b.mp3' } },
];
const dishes = validateCatalogue(fixture);
const pendingImages: MockImage[] = [];
let autoLoad = true;

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_url: string) {
    if (autoLoad) queueMicrotask(() => this.onload?.());
    else pendingImages.push(this);
  }
}

function start(topic: 'songs' | 'food') {
  render(<I18nProvider>{topic === 'songs'
    ? <Game catalogue={songs} topicId="songs" />
    : <FoodGame catalogue={dishes} />}</I18nProvider>);
}
function finish(answer: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: answer } });
  fireEvent.click(screen.getByRole('button', { name: /đoán|guess/i }));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  selected.available = true;
  autoLoad = true;
  pendingImages.length = 0;
  vi.stubGlobal('Image', MockImage);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(['songs', 'food'] as const)('%s result', (topic) => {
  test('opens a Meme dialog over the finished result and removes the inline Meme', async () => {
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    const dialog = await screen.findByRole('dialog', { name: /meme|ảnh vui/i });
    expect(dialog.querySelector('img')).toBeTruthy();
    expect(screen.getByTestId('result').querySelector('img[src*=memes]')).toBeNull();
    expect(dialog.querySelector('button')).toBe(document.activeElement);
  });
  test('close, Escape and backdrop dismiss once and return focus to Next', async () => {
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    const dialog = await screen.findByRole('dialog', { name: /meme|ảnh vui/i });
    const next = screen.getByRole('button', { name: /next|tiếp/i });
    fireEvent.click(dialog.querySelector('button')!);
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    expect(document.activeElement).toBe(next);
    expect(screen.getByTestId('result').textContent).toMatch(/points|điểm/);
    expect(screen.getByRole('list', { name: /guesses|lần đoán/i })).toBeTruthy();

    fireEvent.click(next);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Chạy Ngay Đi' : 'Phở');
    const second = await screen.findByRole('dialog', { name: /meme|ảnh vui/i });
    fireEvent.keyDown(second, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /next|tiếp/i }));
  });

  test('a lost Round shows its lost Meme', async () => {
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    const steps = topic === 'songs' ? 1 : 5;
    for (let index = 0; index < steps; index++) {
      const action = screen.getByRole('button', { name: index === steps - 1 ? /give up|bỏ cuộc/i : /skip|bỏ qua/i });
      fireEvent.click(action);
    }
    const dialog = await screen.findByRole('dialog', { name: /meme|ảnh vui/i });
    expect(dialog.querySelector('img')?.getAttribute('src')).toContain('bbbbbbbbbbbbbbbbbbbbbbbb.webp');
    expect(screen.getByTestId('result').getAttribute('data-status')).toBe('lost');
  });

  test('backdrop dismissal leaves the result accessible', async () => {
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    const dialog = await screen.findByRole('dialog', { name: /meme|ảnh vui/i });
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    expect(screen.getByRole('button', { name: /next|tiếp/i })).toBe(document.activeElement);
  });

  test('disabled or unavailable Memes never open a popup', async () => {
    localStorage.setItem('what-the-song:prefs:v1', JSON.stringify({ memes: false }));
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
  });

  test('no available Meme leaves the result unobstructed', async () => {
    selected.available = false;
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    expect(screen.getByRole('button', { name: /next|tiếp/i })).toBeTruthy();
  });

  test('opens only after the Meme image loads', async () => {
    autoLoad = false;
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    await waitFor(() => expect(pendingImages).toHaveLength(1));
    expect(showModal).not.toHaveBeenCalled();
    await act(async () => { pendingImages[0].onload?.(); });
    expect(screen.getByRole('dialog', { name: /meme|ảnh vui/i })).toBeTruthy();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  test('opens only after the retried Meme image loads', async () => {
    autoLoad = false;
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    await waitFor(() => expect(pendingImages).toHaveLength(1));
    await act(async () => { pendingImages[0].onerror?.(); });
    await waitFor(() => expect(pendingImages).toHaveLength(2));
    expect(showModal).not.toHaveBeenCalled();
    await act(async () => { pendingImages[1].onload?.(); });
    expect(screen.getByRole('dialog', { name: /meme|ảnh vui/i }).querySelector('img')?.getAttribute('src')).toContain('?retry=1');
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  test('never opens when the Meme image and its retry both fail', async () => {
    autoLoad = false;
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    start(topic);
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy());
    finish(topic === 'songs' ? 'Nơi Này Có Anh' : 'Bún bò Huế');
    await waitFor(() => expect(pendingImages).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    await act(async () => { pendingImages[0].onerror?.(); });
    await waitFor(() => expect(pendingImages).toHaveLength(2));
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    await act(async () => { pendingImages[1].onerror?.(); });
    expect(screen.queryByRole('dialog', { name: /meme|ảnh vui/i })).toBeNull();
    expect(showModal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /next|tiếp/i })).toBeTruthy();
  });

});
