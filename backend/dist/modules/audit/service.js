import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
const s3 = new S3Client({ region: env.AWS_REGION });
function computeHash(prevHash, payload) {
    const data = JSON.stringify({ prevHash, payload });
    return crypto.createHash('sha256').update(data).digest('hex');
}
export async function writeAuditLog(entry) {
    // Get last hash
    const last = await prisma.auditLog.findFirst({ orderBy: { eventTime: 'desc' } });
    const prevHash = last?.currHash || null;
    const payload = {
        eventTime: new Date().toISOString(),
        userId: entry.userId || null,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata || null,
        before: entry.before || null,
        after: entry.after || null,
    };
    const currHash = computeHash(prevHash, payload);
    const saved = await prisma.auditLog.create({ data: {
            userId: payload.userId || undefined,
            ip: payload.ip || undefined,
            userAgent: payload.userAgent || undefined,
            action: payload.action,
            resourceType: payload.resourceType,
            resourceId: payload.resourceId,
            metadataJson: payload.metadata,
            beforeJson: payload.before,
            afterJson: payload.after,
            prevHash: prevHash || undefined,
            currHash,
        } });
    // Fire-and-forget export to S3 (if configured)
    if (env.AUDIT_S3_BUCKET) {
        const key = `audit/${new Date().toISOString().slice(0, 10)}/${saved.id}.json`;
        s3.send(new PutObjectCommand({
            Bucket: env.AUDIT_S3_BUCKET,
            Key: key,
            Body: Buffer.from(JSON.stringify({ ...payload, prevHash, currHash }), 'utf8'),
            ContentType: 'application/json',
            ServerSideEncryption: 'aws:kms',
            // KMS key taken from bucket policy or default
        })).catch(() => { });
    }
    return saved;
}
