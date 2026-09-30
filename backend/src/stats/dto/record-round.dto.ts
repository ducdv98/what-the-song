import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { BEST_SCORE, DIFFICULTY_SLUGS } from '../game-rules.js';

export class RecordRoundDto {
  @IsString()
  @Matches(/^[\w.-]{1,120}$/)
  songId: string;

  @IsBoolean()
  won: boolean;

  @IsInt()
  @Min(0)
  @Max(BEST_SCORE)
  score: number;

  @IsIn(DIFFICULTY_SLUGS)
  difficulty: string;

  /** null or absent means "all genres". */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(/^[a-z0-9-]{1,40}$/)
  genre: string | null = null;
}
