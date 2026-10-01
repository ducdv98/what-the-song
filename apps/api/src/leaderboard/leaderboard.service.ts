import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ApiErrorCode,
  LeaderboardResponse,
  LeaderboardRow,
} from '@wts/contracts';
import { getTopic } from '@wts/topics';
import {
  periodRange,
  type LeaderboardBack,
  type LeaderboardPeriod,
} from '@wts/core';
import { DataSource } from 'typeorm';
import type { Env } from '../config/env.validation.js';

/** More than a group of friends will ever fill; bounds the response. */
const MAX_ROWS = 100;

@Injectable()
export class LeaderboardService {
  private readonly utcOffset: number;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService<Env, true>,
  ) {
    this.utcOffset = config.get('LEADERBOARD_UTC_OFFSET', { infer: true });
  }

  /**
   * Total points per player over a week or month, straight from `rounds` —
   * the source of truth, so the board can never disagree with what was
   * played. The time and Topic indexes serve the respective time windows.
   *
   * Ranked on points with RANK(), so equal points share a place (1, 1, 3).
   * Wins, then fewer rounds, then name only order players within a tie.
   */
  async board(
    period: LeaderboardPeriod,
    back: LeaderboardBack,
    now = Date.now(),
    topic?: string,
  ): Promise<LeaderboardResponse> {
    if (topic !== undefined && !getTopic(topic))
      throw new BadRequestException({
        code: 'unknown_topic' satisfies ApiErrorCode,
      });
    const range = periodRange(period, now, this.utcOffset, back);
    const from = new Date(range.from);
    const to = new Date(range.to);

    const rows: LeaderboardRow[] = await this.dataSource.query(
      `SELECT RANK() OVER (ORDER BY SUM(r.score) DESC)::int AS rank,
              u.username,
              SUM(r.score)::int                       AS points,
              COUNT(*)::int                           AS rounds,
              (COUNT(*) FILTER (WHERE r.won))::int    AS wins
         FROM rounds r
         JOIN users u ON u.id = r.user_id
        WHERE r.played_at >= $1 AND r.played_at < $2
          ${topic === undefined ? '' : 'AND r.topic = $3'}
        GROUP BY u.id, u.username
        ORDER BY points DESC, wins DESC, rounds ASC, lower(u.username) ASC
        LIMIT ${MAX_ROWS}`,
      topic === undefined ? [from, to] : [from, to, topic],
    );

    return {
      period,
      back,
      from: from.toISOString(),
      to: to.toISOString(),
      utcOffset: this.utcOffset,
      rows,
    };
  }
}
