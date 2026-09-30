import { Controller, Get, Query } from '@nestjs/common';
import type { LeaderboardResponse } from '@wts/contracts';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto.js';
import { LeaderboardService } from './leaderboard.service.js';

/**
 * Public to anyone who got past the site's basic auth: a guest seeing the
 * board is the best argument for creating an account. Only signed-in players
 * are on it, since only their rounds are recorded.
 */
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  get(@Query() q: LeaderboardQueryDto): Promise<LeaderboardResponse> {
    return this.leaderboard.board(q.period, q.back);
  }
}
