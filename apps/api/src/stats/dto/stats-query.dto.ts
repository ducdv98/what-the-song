import { TOPIC_ID_PATTERN, type StatsQuery } from '@wts/contracts';
import { IsOptional, IsString, Matches } from 'class-validator';

export class StatsQueryDto implements StatsQuery {
  @IsOptional()
  @IsString()
  @Matches(new RegExp(TOPIC_ID_PATTERN))
  topic?: string;
}
