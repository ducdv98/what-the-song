import {
  GENRE_SLUG_PATTERN,
  SONG_ID_PATTERN,
  type RoundReport,
} from '@wts/contracts';
import { BEST_SCORE, DIFFICULTIES } from '@wts/game';
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

/**
 * Bounds come straight from the game package the browser plays with, so a new
 * difficulty or a rescaled score cannot be rejected here by a stale copy.
 */
export class RecordRoundDto implements RoundReport {
  @IsString()
  @Matches(new RegExp(SONG_ID_PATTERN))
  songId: string;

  @IsBoolean()
  won: boolean;

  @IsInt()
  @Min(0)
  @Max(BEST_SCORE)
  score: number;

  @IsIn(DIFFICULTIES.map((d) => d.slug))
  difficulty: string;

  /** null or absent means "all genres". */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(new RegExp(GENRE_SLUG_PATTERN))
  genre: string | null = null;
}
