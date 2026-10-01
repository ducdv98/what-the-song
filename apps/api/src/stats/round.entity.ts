import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Every finished round a signed-in player plays. This table is the source of
 * truth for anything ranked later — a leaderboard by week, by Topic or by
 * difficulty is a query over it, so nothing is thrown away.
 */
@Entity({ name: 'rounds' })
export class Round {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 40, default: 'songs' })
  topic: string;

  @Column({ name: 'subject_id', type: 'varchar', length: 120 })
  subjectId: string;

  @Column({ type: 'boolean' })
  won: boolean;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'varchar', length: 20 })
  difficulty: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  facet: string | null;

  @Column({ name: 'played_at', type: 'timestamptz', default: () => 'now()' })
  playedAt: Date;
}
