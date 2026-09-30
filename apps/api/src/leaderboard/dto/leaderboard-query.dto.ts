import type { LeaderboardQuery } from '@wts/contracts';
import {
  LEADERBOARD_BACKS,
  LEADERBOARD_PERIODS,
  type LeaderboardBack,
  type LeaderboardPeriod,
} from '@wts/game';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

/** Both default to the current week, so a bare GET /leaderboard is useful. */
export class LeaderboardQueryDto implements LeaderboardQuery {
  @IsIn(LEADERBOARD_PERIODS)
  period: LeaderboardPeriod = 'week';

  // Query strings arrive as text; "1" must become 1 before the check.
  @Transform(({ value }) => (value === undefined ? 0 : Number(value)))
  @IsIn(LEADERBOARD_BACKS)
  back: LeaderboardBack = 0;
}
