import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const PASSWORD_MIN = 8;
/** Bounds hashing work per request; nobody needs a longer password. */
export const PASSWORD_MAX = 128;

export class RegisterDto {
  /**
   * ASCII only. A username is a handle people type on each other's phones —
   * Vietnamese tone marks would make "which spelling was it" a real question,
   * and NFC/NFD variants would make identical-looking names distinct. A display
   * name with diacritics can come alongside the leaderboard.
   */
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,20}$/)
  username: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password: string;
}
