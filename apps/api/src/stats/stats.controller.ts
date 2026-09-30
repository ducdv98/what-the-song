import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { StatsResponse } from '@wts/contracts';
import {
  JwtAuthGuard,
  type AuthedRequest,
} from '../auth/guards/jwt-auth.guard.js';
import { RecordRoundDto } from './dto/record-round.dto.js';
import { StatsService } from './stats.service.js';

/** Signed-in players only — guests keep their stats in the browser tab. */
@Controller()
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('stats/me')
  async mine(@Req() req: AuthedRequest): Promise<StatsResponse> {
    return { stats: await this.stats.get(req.auth.sub) };
  }

  @Post('rounds')
  @HttpCode(201)
  async record(
    @Req() req: AuthedRequest,
    @Body() dto: RecordRoundDto,
  ): Promise<StatsResponse> {
    return { stats: await this.stats.record(req.auth.sub, dto) };
  }
}
