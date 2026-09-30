import { EMAIL_MAX, PASSWORD_MAX, type LoginRequest } from '@wts/contracts';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Checked loosely on purpose: a malformed identifier simply matches no
 * account, and saying *why* it failed would only help someone guessing.
 */
export class LoginDto implements LoginRequest {
  /** Username or email — told apart by the '@'. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(EMAIL_MAX)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}
