import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX } from './register.dto.js';

/**
 * Checked loosely on purpose: a malformed identifier simply matches no
 * account, and saying *why* it failed would only help someone guessing.
 */
export class LoginDto {
  /** Username or email — told apart by the '@'. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}
