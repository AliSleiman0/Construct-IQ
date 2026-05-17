import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private publicBaseUrl: string | null = null;

  onModuleInit() {
    const {
      S3_BUCKET,
      S3_REGION,
      S3_ENDPOINT,
      S3_ACCESS_KEY,
      S3_SECRET_KEY,
      S3_PUBLIC_URL,
    } = process.env;

    if (!S3_BUCKET) {
      this.logger.warn('S3_BUCKET not set — file uploads will return 503');
      return;
    }

    this.bucket = S3_BUCKET;
    this.publicBaseUrl =
      S3_PUBLIC_URL || `https://${S3_BUCKET}.s3.${S3_REGION ?? 'us-east-1'}.amazonaws.com`;
    this.client = new S3Client({
      region: S3_REGION ?? 'us-east-1',
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: !!S3_ENDPOINT,
      credentials:
        S3_ACCESS_KEY && S3_SECRET_KEY
          ? { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY }
          : undefined,
    });
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new ServiceUnavailableException(
        'File upload is not configured on this server',
      );
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
}
