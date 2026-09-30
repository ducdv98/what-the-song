import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

/**
 * Strict DTO validation: unknown properties are rejected, not silently dropped,
 * and failures name the offending fields so the client can point at them.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: 'validation_failed',
        fields: errors.map((e) => e.property),
      }),
  });
}
