import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  413: 'too_large',
  415: 'unsupported_media_type',
  429: 'rate_limited',
};

/**
 * Every error leaves as `{ statusCode, code, message?, fields? }`.
 *
 * `code` is a stable machine-readable string; the web client maps it to
 * translated copy, so no user-facing wording lives in the API. Anything that
 * is not an HttpException is a bug: logged in full, reported as a bare 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const obj =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)
          : {};
      res.status(status).json({
        statusCode: status,
        code:
          typeof obj.code === 'string'
            ? obj.code
            : (DEFAULT_CODES[status] ?? 'error'),
        ...(typeof obj.message === 'string' ? { message: obj.message } : {}),
        ...(Array.isArray(obj.fields) ? { fields: obj.fields } : {}),
      });
      return;
    }

    // body-parser's own errors (oversized or malformed JSON) are not
    // HttpExceptions, but they are client errors and say so via `expose`.
    const parserError = exception as {
      status?: unknown;
      expose?: unknown;
    } | null;
    if (
      parserError &&
      parserError.expose === true &&
      typeof parserError.status === 'number' &&
      parserError.status >= 400 &&
      parserError.status < 500
    ) {
      const status = parserError.status;
      res.status(status).json({
        statusCode: status,
        code: DEFAULT_CODES[status] ?? 'bad_request',
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, code: 'server_error' });
  }
}
