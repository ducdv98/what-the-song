import { TOPIC_ID_PATTERN, type LeaderboardQuery } from '@wts/contracts';
import {
  LEADERBOARD_BACKS,
  LEADERBOARD_PERIODS,
  type LeaderboardBack,
  type LeaderboardPeriod,
} from '@wts/core';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

/** Both default to the current week, so a bare GET /leaderboard is useful. */
export class LeaderboardQueryDto implements LeaderboardQuery {
  @IsIn(LEADERBOARD_PERIODS)
  period: LeaderboardPeriod = 'week';

  // Query strings arrive as text; "1" must become 1 before the check.
  @Transform(({ value }) => (value === undefined ? 0 : Number(value)))
  @IsIn(LEADERBOARD_BACKS)
  back: LeaderboardBack = 0;

  @IsOptional()
  @IsString()
  @Matches(new RegExp(TOPIC_ID_PATTERN))
  topic?: string;
}
