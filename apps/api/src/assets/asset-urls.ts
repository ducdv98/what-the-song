import COS from 'cos-nodejs-sdk-v5';

export type SignedAssetUrls = {
  urls: Record<string, string>;
  expiresAt: Record<string, number | null>;
};

export interface AssetUrls {
  sign(keys: string[]): SignedAssetUrls;
}

export class LocalAssetUrls implements AssetUrls {
  sign(keys: string[]): SignedAssetUrls {
    return {
      urls: Object.fromEntries(keys.map((key) => [key, `/assets/${key}`])),
      expiresAt: Object.fromEntries(keys.map((key) => [key, null])),
    };
  }
}

export class CosAssetUrls implements AssetUrls {
  private readonly cos: COS;

  constructor(
    private readonly bucket: string,
    private readonly region: string,
    secretId: string,
    secretKey: string,
  ) {
    this.cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  }

  sign(keys: string[]): SignedAssetUrls {
    const urls: Record<string, string> = {};
    const expiresAt: Record<string, number> = {};
    const now = Date.now();
    for (const key of keys) {
      const ttlSeconds = key.endsWith('/catalogue.json') ? 300 : 1800;
      urls[key] = this.cos.getObjectUrl({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Sign: true,
        Method: 'GET',
        Protocol: 'https:',
        Expires: ttlSeconds,
      });
      expiresAt[key] = now + ttlSeconds * 1000;
    }
    return { urls, expiresAt };
  }
}
