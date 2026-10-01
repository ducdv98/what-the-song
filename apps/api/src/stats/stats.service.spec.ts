import type { DataSource } from 'typeorm';
import { StatsService } from './stats.service.js';
import type { RecordRoundDto } from './dto/record-round.dto.js';

const round = {
  songId: 'noi-nay-co-anh',
  won: true,
  score: 800,
  difficulty: 'medium',
  genre: 'nhac-tre',
} as RecordRoundDto;

function setup() {
  const insert = vi.fn().mockResolvedValue(undefined);
  const query = vi.fn().mockResolvedValue([{
    played: 1, won: 1, currentStreak: 1, bestStreak: 1, totalScore: 800,
  }]);
  const transaction = vi.fn(async (callback: (em: { insert: typeof insert; query: typeof query }) => Promise<unknown>) =>
    callback({ insert, query }));
  const service = new StatsService({ transaction } as unknown as DataSource);
  return { service, transaction, insert };
}

describe('recording a round with a Topic', () => {
  it('accepts an omitted Topic as Songs and an explicit Songs Topic', async () => {
    const { service, insert } = setup();
    await expect(service.record('player', round)).resolves.toMatchObject({ played: 1 });
    await expect(service.record('player', { ...round, topic: 'songs' })).resolves.toMatchObject({ played: 1 });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown Topic before writing', async () => {
    const { service, transaction } = setup();
    await expect(service.record('player', { ...round, topic: 'people' })).rejects.toMatchObject({
      response: { code: 'unknown_topic' },
      status: 400,
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
