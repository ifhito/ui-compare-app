import crypto from 'node:crypto';

const SIGNATURE_VERSION = 'v1';
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface StackblitzVerifyInput {
  payload: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

export function verifyStackblitzSignature({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = () => Math.floor(Date.now() / 1000),
}: StackblitzVerifyInput): boolean {
  if (!payload || !signatureHeader || !secret) {
    return false;
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  const expectedSignature = computeSignature(secret, payload, timestamp);
  const age = Math.abs(now() - timestamp);
  if (age > toleranceSeconds) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  return signatures.some((signature) => {
    if (typeof signature !== 'string' || signature.length !== expectedSignature.length) {
      return false;
    }
    try {
      const candidate = Buffer.from(signature, 'hex');
      if (candidate.length !== expectedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(candidate, expectedBuffer);
    } catch {
      return false;
    }
  });
}

function parseSignatureHeader(header: string) {
  const parts = header.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  if (!timestampPart) {
    throw new Error('Missing timestamp in StackBlitz signature header');
  }
  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid timestamp in StackBlitz signature header');
  }

  const signatures = parts
    .filter((part) => part.startsWith(`${SIGNATURE_VERSION}=`))
    .map((part) => part.slice(SIGNATURE_VERSION.length + 1));
  if (signatures.length === 0) {
    throw new Error('Missing signature value in StackBlitz signature header');
  }

  return { timestamp, signatures };
}

function computeSignature(secret: string, payload: string, timestamp: number) {
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}
