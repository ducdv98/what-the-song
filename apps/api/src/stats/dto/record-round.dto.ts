import {
  FACET_SLUG_PATTERN,
  SUBJECT_ID_PATTERN,
  TOPIC_ID_PATTERN,
  type RoundReport,
} from '@wts/contracts';
import { BEST_SCORE, TIER_SLUGS } from '@wts/core';
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
 * tier or a rescaled score cannot be rejected here by a stale copy.
 * `difficulty` is the song's tier (easy … impossible).
 */
export class RecordRoundDto implements RoundReport {
  /** An absent Topic keeps existing clients on Songs. The service checks known ids. */
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(new RegExp(TOPIC_ID_PATTERN))
  topic?: string;

  @IsString()
  @Matches(new RegExp(SUBJECT_ID_PATTERN))
  subjectId: string;

  @IsBoolean()
  won: boolean;

  @IsInt()
  @Min(0)
  @Max(BEST_SCORE)
  score: number;

  @IsIn(TIER_SLUGS)
  difficulty: string;

  /** null or absent means no Facet filter. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(new RegExp(FACET_SLUG_PATTERN))
  facet: string | null = null;
}
