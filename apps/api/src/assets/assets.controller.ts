import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import type { Env } from '../config/env.validation.js';
import { CosAssetUrls, LocalAssetUrls, type AssetUrls } from './asset-urls.js';

const ASSET_KEY =
  /^(?:(?!memes\/)[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:[a-f0-9]{24}\.mp3|cover-[a-f0-9]{16}\.jpg)|[a-z0-9]+(?:-[a-z0-9]+)*\/catalogue\.json|memes\/[a-f0-9]{24}\.(?:webp|jpg|png))$/;

class AssetUrlsDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayMinSize(1)
  @IsString({ each: true })
  keys: string[];
}

@Controller('assets')
export class AssetsController {
  private readonly urls: AssetUrls;

  constructor(config: ConfigService<Env, true>) {
    const bucket = config.get('COS_BUCKET', { infer: true });
    this.urls = bucket
      ? new CosAssetUrls(
          bucket,
          config.get('COS_REGION', { infer: true })!,
          config.get('COS_SECRET_ID', { infer: true })!,
          config.get('COS_SECRET_KEY', { infer: true })!,
        )
      : new LocalAssetUrls();
  }

  /** One request covers the current Round's Clues and optional cover. */
  @Post('urls')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sign(@Body() dto: AssetUrlsDto): {
    urls: Record<string, string>;
    expiresAt: Record<string, number | null>;
  } {
    if (dto.keys.some((key) => !ASSET_KEY.test(key))) {
      throw new BadRequestException({
        code: 'validation_failed',
        fields: ['keys'],
      });
    }
    return this.urls.sign(dto.keys);
  }
}
