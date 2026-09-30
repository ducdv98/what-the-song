import {
  ArgumentsHost,
  ConflictException,
  HttpException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return {
    status: res.status.mock.calls[0][0],
    body: res.json.mock.calls[0][0],
  };
}

describe('HttpExceptionFilter', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('passes an explicit code through', () => {
    expect(run(new ConflictException({ code: 'username_taken' }))).toEqual({
      status: 409,
      body: { statusCode: 409, code: 'username_taken' },
    });
  });

  it('derives a code from the status when none was given', () => {
    expect(run(new UnauthorizedException()).body.code).toBe('unauthenticated');
    expect(run(new HttpException('Too Many Requests', 429)).body.code).toBe(
      'rate_limited',
    );
  });

  it('hides the details of unexpected errors', () => {
    const out = run(new Error('connection string with a password in it'));
    expect(out).toEqual({
      status: 500,
      body: { statusCode: 500, code: 'server_error' },
    });
  });

  it('treats body-parser errors as the client errors they are', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });
    expect(run(tooLarge)).toEqual({
      status: 413,
      body: { statusCode: 413, code: 'too_large' },
    });
  });
});
