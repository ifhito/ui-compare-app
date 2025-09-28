import { TurnstileVerifier } from '../../application/voting/submit-vote';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  constructor(private readonly secretKey: string | undefined) {}

  async verify(token: string): Promise<boolean> {
    if (!this.secretKey) {
      // In development environments allow bypass
      return true;
    }

    const form = new FormData();
    form.append('secret', this.secretKey);
    form.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      console.error('Turnstile verification failed:', response.statusText);
      return false;
    }

    const data: TurnstileResponse = await response.json();
    if (!data.success) {
      console.warn('Turnstile verification error codes:', data['error-codes']);
    }
    return data.success;
  }
}

export class NoopTurnstileVerifier implements TurnstileVerifier {
  async verify(): Promise<boolean> {
    return true;
  }
}
