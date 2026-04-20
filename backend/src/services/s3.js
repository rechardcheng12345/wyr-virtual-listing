import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const region = process.env.AWS_REGION || 'ap-southeast-1';
const bucket = process.env.S3_BUCKET_NAME || '';

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const S3_BUCKET = bucket;

export function buildObjectUrl(key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
}

export async function uploadToS3(key, body, contentType) {
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured');
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return buildObjectUrl(key);
}

export async function deleteFromS3(key) {
  if (!bucket) return;
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getPresignedUrl(key, expiresInSec = 3600) {
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured');
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSec }
  );
}

// 7 days is the SigV4 maximum
export async function getPresignedDownloadUrl(key, filename, expiresInSec = 604800) {
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured');
  const disposition = filename
    ? `attachment; filename="${filename.replace(/"/g, '')}"`
    : 'attachment';
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: expiresInSec }
  );
}

export function keyFromUrl(url) {
  const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (url.startsWith(prefix)) return decodeURI(url.slice(prefix.length));
  return null;
}
