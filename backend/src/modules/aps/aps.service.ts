import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const APS_HOST = 'https://developer.api.autodesk.com';

export interface ApsDrawingUploadResult {
  objectId: string;
  urn: string;
}

@Injectable()
export class ApsService {
  private readonly logger = new Logger(ApsService.name);

  private get clientId(): string {
    return process.env.APS_CLIENT_ID ?? '';
  }

  private get clientSecret(): string {
    return process.env.APS_CLIENT_SECRET ?? '';
  }

  get bucketKey(): string {
    return process.env.APS_BUCKET_KEY ?? 'constructiq-drawings';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async getToken(scopes: string[]): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Autodesk Platform Services credentials are not configured. Set APS_CLIENT_ID and APS_CLIENT_SECRET.',
      );
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${APS_HOST}/authentication/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: scopes.join(' '),
      }),
    });
    if (!res.ok) {
      this.logger.error(`APS auth failed: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('Autodesk authentication failed');
    }
    const data = await res.json() as any;
    return data.access_token as string;
  }

  async getViewerToken(): Promise<{ access_token: string; expires_in: number }> {
    const access_token = await this.getToken(['viewables:read']);
    return { access_token, expires_in: 3600 };
  }

  async ensureBucket(token: string): Promise<void> {
    const checkRes = await fetch(`${APS_HOST}/oss/v2/buckets/${this.bucketKey}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkRes.ok) return;
    if (checkRes.status !== 404) return;

    const createRes = await fetch(`${APS_HOST}/oss/v2/buckets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketKey: this.bucketKey, policyKey: 'persistent' }),
    });
    if (!createRes.ok) {
      const body = await createRes.json() as any;
      // 409 = already exists (race); anything else is a real error
      if (body?.reason !== 'Bucket already exists') {
        throw new ServiceUnavailableException('Failed to create APS bucket');
      }
    }
  }

  async uploadToOss(
    objectKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<ApsDrawingUploadResult> {
    const token = await this.getToken([
      'data:write',
      'data:create',
      'bucket:create',
      'bucket:read',
    ]);
    await this.ensureBucket(token);

    const res = await fetch(
      `${APS_HOST}/oss/v2/buckets/${this.bucketKey}/objects/${encodeURIComponent(objectKey)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
        body: new Uint8Array(buffer),
      },
    );
    if (!res.ok) {
      this.logger.error(`APS OSS upload failed: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('Failed to upload file to Autodesk storage');
    }
    const data = await res.json() as any;
    const objectId = data.objectId as string;
    // URN = base64url of the objectId, no padding
    const urn = Buffer.from(objectId).toString('base64url');
    return { objectId, urn };
  }

  async triggerTranslation(urn: string): Promise<void> {
    const token = await this.getToken(['data:read', 'data:write', 'data:create']);
    const res = await fetch(`${APS_HOST}/modelderivative/v2/designdata/job`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-ads-force': 'true',
      },
      body: JSON.stringify({
        input: { urn, compressedUrn: false },
        output: { formats: [{ type: 'svf2', views: ['2d', '3d'] }] },
      }),
    });
    if (!res.ok) {
      this.logger.warn(`APS translation job failed: ${res.status}`);
    }
  }

  async getManifest(urn: string): Promise<{ status: string; progress: string }> {
    const token = await this.getToken(['data:read']);
    const res = await fetch(`${APS_HOST}/modelderivative/v2/designdata/${urn}/manifest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { status: 'failed', progress: '0%' };
    const data = await res.json() as any;
    return { status: data.status as string, progress: (data.progress ?? '0%') as string };
  }
}
