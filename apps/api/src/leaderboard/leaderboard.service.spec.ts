import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { LeaderboardService } from './leaderboard.service.js';
import type { Env } from '../config/env.validation.js';

describe('Leaderboard by Topic', () => {
  it('filters a People board and leaves the global board unfiltered', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new LeaderboardService(
      { query } as unknown as DataSource,
      { get: () => 420 } as unknown as ConfigService<Env, true>,
    );
    await service.board('week', 0, Date.UTC(2026, 9, 1), 'people');
    expect(query.mock.calls[0]?.[0]).toContain('AND r.topic = $3');
    expect(query.mock.calls[0]?.[1][2]).toBe('people');
    await service.board('week', 0, Date.UTC(2026, 9, 1));
    expect(query.mock.calls[1]?.[0]).not.toContain('AND r.topic = $3');
    expect(query.mock.calls[1]?.[1]).toHaveLength(2);
  });
});
