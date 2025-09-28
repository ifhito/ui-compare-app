import { describe, expect, it } from 'vitest';
import {
  buildSignatureHeader,
  computeStackblitzSignature,
  parseSignatureHeader,
  verifyStackblitzSignature,
  DEFAULT_TOLERANCE_SECONDS,
} from '../src/webhooks/stackblitz.js';

const SECRET = 'test_secret_key';
const PAYLOAD = '{"foo":"bar"}';

describe('StackBlitz webhook signature utilities', () => {
  it('parses signature headers', () => {
    const timestamp = 1_700_000_000;
    const signature = 'abc123';
    const header = `t=${timestamp},v1=${signature}`;
    const result = parseSignatureHeader(header);
    expect(result.timestamp).toBe(timestamp);
    expect(result.signatures).toEqual([signature]);
  });

  it('computes signatures compatible with parse/build helpers', () => {
    const timestamp = 1_700_000_000;
    const signature = computeStackblitzSignature(SECRET, PAYLOAD, timestamp);
    const header = buildSignatureHeader({ timestamp, signature });
    const parsed = parseSignatureHeader(header);
    expect(parsed.timestamp).toBe(timestamp);
    expect(parsed.signatures[0]).toBe(signature);
  });

  it('verifies valid signatures', () => {
    const timestamp = 1_700_000_000;
    const signature = computeStackblitzSignature(SECRET, PAYLOAD, timestamp);
    const header = buildSignatureHeader({ timestamp, signature });

    const verified = verifyStackblitzSignature({
      payload: PAYLOAD,
      signatureHeader: header,
      secret: SECRET,
      now: () => timestamp + 60,
    });

    expect(verified).toBe(true);
  });

  it('rejects expired signatures when outside tolerance', () => {
    const timestamp = 1_700_000_000;
    const signature = computeStackblitzSignature(SECRET, PAYLOAD, timestamp);
    const header = buildSignatureHeader({ timestamp, signature });

    const verified = verifyStackblitzSignature({
      payload: PAYLOAD,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 10,
      now: () => timestamp + 11,
    });

    expect(verified).toBe(false);
  });

  it('rejects invalid signatures', () => {
    const timestamp = 1_700_000_000;
    const signature = computeStackblitzSignature(SECRET, PAYLOAD, timestamp);
    const header = buildSignatureHeader({ timestamp, signature: `${signature}0` });

    const verified = verifyStackblitzSignature({
      payload: PAYLOAD,
      signatureHeader: header,
      secret: SECRET,
      now: () => timestamp,
    });

    expect(verified).toBe(false);
  });

  it('supports multiple signatures in header', () => {
    const timestamp = 1_700_000_000;
    const valid = computeStackblitzSignature(SECRET, PAYLOAD, timestamp);
    const header = `t=${timestamp},v1=bad,v1=${valid}`;

    const verified = verifyStackblitzSignature({
      payload: PAYLOAD,
      signatureHeader: header,
      secret: SECRET,
      now: () => timestamp,
    });

    expect(verified).toBe(true);
  });

  it('throws when header malformed', () => {
    expect(() => parseSignatureHeader('v1=abc')).toThrow(/timestamp/);
    expect(() => parseSignatureHeader()).toThrow(/Missing/);
  });

  it('throws when secret missing', () => {
    expect(() => computeStackblitzSignature('', PAYLOAD, 0)).toThrow('Secret is required');
    expect(() =>
      verifyStackblitzSignature({ payload: PAYLOAD, signatureHeader: 't=1,v1=abc', secret: '' }),
    ).toThrow('Secret is required');
  });

  it('throws when payload missing', () => {
    expect(() =>
      verifyStackblitzSignature({ payload: '', signatureHeader: 't=1,v1=abc', secret: 'secret' }),
    ).toThrow('Payload is required');
  });

  it('exposes default tolerance constant', () => {
    expect(DEFAULT_TOLERANCE_SECONDS).toBe(300);
  });
});
