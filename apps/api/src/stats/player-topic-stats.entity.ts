import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Running totals for one player in one Topic. */
@Entity({ name: 'player_topic_stats' })
export class PlayerTopicStats {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 40 })
  topic: string;

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
