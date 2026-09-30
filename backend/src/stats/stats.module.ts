import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { PlayerStats } from './player-stats.entity.js';
import { Round } from './round.entity.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Round, PlayerStats])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
