import crypto from 'node:crypto';

const SIGNATURE_VERSION = 'v1';
export const DEFAULT_TOLERANCE_SECONDS = 300;

export function parseSignatureHeader(header) {
  if (!header || typeof header !== 'string') {
    throw new Error('Missing StackBlitz signature header');
  }

  const parts = header.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  if (!timestampPart) {
    throw new Error('StackBlitz signature header missing timestamp');
  }

  const timestamp = Number(timestampPart.split('=')[1]);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid StackBlitz signature timestamp');
  }

  const signatureParts = parts
    .filter((part) => part.startsWith(`${SIGNATURE_VERSION}=`))
    .map((part) => part.substring(SIGNATURE_VERSION.length + 1));

  if (signatureParts.length === 0) {
    throw new Error('StackBlitz signature header missing signature value');
  }

  return { timestamp, signatures: signatureParts };
}

export function computeStackblitzSignature(secret, payload, timestamp) {
  if (!secret) {
    throw new Error('Secret is required to compute StackBlitz signature');
  }
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

export function verifyStackblitzSignature({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = () => Math.floor(Date.now() / 1000),
}) {
  if (!payload) {
    throw new Error('Payload is required for signature verification');
  }
  if (!secret) {
    throw new Error('Secret is required for signature verification');
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  const expected = computeStackblitzSignature(secret, payload, timestamp);

  const age = Math.abs(now() - timestamp);
  if (toleranceSeconds != null && age > toleranceSeconds) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');

  return signatures.some((signature) => {
    if (typeof signature !== 'string' || signature.length !== expected.length) {
      return false;
    }

    try {
      const candidate = Buffer.from(signature, 'hex');
      if (candidate.length !== expectedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(candidate, expectedBuffer);
    } catch (error) {
      return false;
    }
  });
}

export function buildSignatureHeader({ timestamp, signature }) {
  return `t=${timestamp},${SIGNATURE_VERSION}=${signature}`;
}
