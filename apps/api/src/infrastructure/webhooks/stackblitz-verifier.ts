const SIGNATURE_VERSION = 'v1';
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface StackblitzVerifyInput {
  payload: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

const encoder = new TextEncoder();

export async function verifyStackblitzSignature({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = () => Math.floor(Date.now() / 1000),
}: StackblitzVerifyInput): Promise<boolean> {
  if (!payload || !signatureHeader || !secret) {
    return false;
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  const expectedSignature = await computeSignature(secret, payload, timestamp);
  const age = Math.abs(now() - timestamp);
  if (age > toleranceSeconds) {
    return false;
  }

  const expectedBuffer = hexToBytes(expectedSignature);
  return signatures.some((signature) => {
    if (typeof signature !== 'string' || signature.length !== expectedSignature.length) {
      return false;
    }
    try {
      const candidate = hexToBytes(signature);
      return timingSafeEqualBytes(candidate, expectedBuffer);
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

async function computeSignature(secret: string, payload: string, timestamp: number): Promise<string> {
  const message = `${timestamp}.${payload}`;
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return bufferToHex(signatureBuffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
