import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Running totals per player, derived from `rounds` and updated in the same
 * transaction. Kept so the streak bar and an all-time leaderboard are an index
 * read rather than a scan over every round ever played.
 */
@Entity({ name: 'player_stats' })
export class PlayerStats {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'integer', default: 0 })
  played: number;

  @Column({ type: 'integer', default: 0 })
  won: number;

  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @Column({ name: 'best_streak', type: 'integer', default: 0 })
  bestStreak: number;

  @Column({ name: 'total_score', type: 'bigint', default: 0 })
  totalScore: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
