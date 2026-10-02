import type { DataSource } from 'typeorm';
import { StatsService } from './stats.service.js';
import type { RecordRoundDto } from './dto/record-round.dto.js';

const round = {
  subjectId: 'noi-nay-co-anh',
  won: true,
  score: 800,
  difficulty: 'impossible',
  facet: 'nhac-tre',
} as RecordRoundDto;

function setup() {
  const insert = vi.fn().mockResolvedValue(undefined);
  const query = vi.fn().mockResolvedValue([
    {
      played: 1,
      won: 1,
      currentStreak: 1,
      bestStreak: 1,
      totalScore: 800,
    },
  ]);
  const transaction = vi.fn(
    async (
      callback: (em: {
        insert: typeof insert;
        query: typeof query;
      }) => Promise<unknown>,
    ) => callback({ insert, query }),
  );
  const service = new StatsService({ transaction } as unknown as DataSource);
  return { service, transaction, insert, query };
}

describe('recording a round with a Topic', () => {
  it('accepts an omitted Topic as Songs and an explicit Songs Topic', async () => {
    const { service, insert, query } = setup();
    await expect(service.record('player', round)).resolves.toMatchObject({
      played: 1,
    });
    await expect(
      service.record('player', { ...round, topic: 'songs' }),
    ).resolves.toMatchObject({ played: 1 });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0]?.[1]).toMatchObject({
      topic: 'songs',
      subjectId: round.subjectId,
      facet: round.facet,
    });
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[1]?.[1]).toEqual(['player', 'songs', 1, 800]);
  });

  it('rejects an unknown Topic before writing', async () => {
    const { service, transaction } = setup();
    await expect(
      service.record('player', { ...round, topic: 'people' }),
    ).rejects.toMatchObject({
      response: { code: 'unknown_topic' },
      status: 400,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('stores an in-range win as reported', async () => {
    const { service, insert, query } = setup();
    await service.record('player', {
      ...round,
      difficulty: 'easy',
      score: 200,
    });
    expect(insert.mock.calls[0]?.[1]).toMatchObject({ score: 200 });
    expect(query.mock.calls[0]?.[1]).toEqual(['player', 1, 200]);
    expect(query.mock.calls[1]?.[1]).toEqual(['player', 'songs', 1, 200]);
  });

  it('clamps an old-client win to its Tier ceiling in the Round and both totals', async () => {
    const { service, insert, query } = setup();
    await service.record('player', {
      ...round,
      difficulty: 'easy',
      score: 1000,
    });
    expect(insert.mock.calls[0]?.[1]).toMatchObject({ score: 400 });
    expect(query.mock.calls[0]?.[1]).toEqual(['player', 1, 400]);
    expect(query.mock.calls[1]?.[1]).toEqual(['player', 'songs', 1, 400]);
  });

  it('rejects a win below its Tier floor and a scoring loss', async () => {
    const { service, transaction } = setup();
    await expect(
      service.record('player', { ...round, difficulty: 'easy', score: 19 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.record('player', { ...round, won: false, score: 20 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reads global or Topic totals and rejects unknown Topics', async () => {
    const global = {
      played: 3,
      won: 2,
      currentStreak: 1,
      bestStreak: 2,
      totalScore: '1600',
    };
    const findOneBy = vi
      .fn()
      .mockResolvedValueOnce(global)
      .mockResolvedValueOnce(null);
    const getRepository = vi.fn().mockReturnValue({ findOneBy });
    const service = new StatsService({
      getRepository,
    } as unknown as DataSource);
    await expect(service.get('player')).resolves.toMatchObject({
      played: 3,
      totalScore: 1600,
    });
    await expect(service.get('player', 'songs')).resolves.toMatchObject({
      played: 0,
      totalScore: 0,
    });
    expect(findOneBy).toHaveBeenNthCalledWith(2, {
      userId: 'player',
      topic: 'songs',
    });
    await expect(service.get('player', 'people')).rejects.toMatchObject({
      response: { code: 'unknown_topic' },
      status: 400,
    });
  });
});
