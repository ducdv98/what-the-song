// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from './I18nProvider';
import { Leaderboard } from './Leaderboard';

const leaderboard = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/client', () => ({ authApi: { leaderboard } }));
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ status: 'guest', user: null, available: false, openDialog: vi.fn() }),
}));

afterEach(() => { cleanup(); leaderboard.mockReset(); });

const board = { period: 'week', back: 0, from: '2026-09-28T00:00:00Z', to: '2026-10-05T00:00:00Z', utcOffset: 7, rows: [] };

test.each(['songs', 'food', 'people'])('the %s board asks the API for that Topic only', async (topic) => {
  leaderboard.mockResolvedValue(board);
  render(<I18nProvider><Leaderboard version={0} topic={topic} /></I18nProvider>);
  await waitFor(() => assert.equal(leaderboard.mock.calls.length, 1));
  assert.deepEqual(leaderboard.mock.calls[0], ['week', 0, topic]);
  fireEvent.click(screen.getByRole('radio', { name: /month|tháng/i }));
  await waitFor(() => assert.equal(leaderboard.mock.calls.length, 2));
  assert.deepEqual(leaderboard.mock.calls[1], ['month', 0, topic]);
});
