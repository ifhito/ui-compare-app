export interface VotingPolicyInput {
  turnstileVerified: boolean;
  hasExceededRateLimit: boolean;
}

export function ensureVotingAllowed(input: VotingPolicyInput) {
  if (!input.turnstileVerified) {
    throw new Error('Turnstile verification required');
  }
  if (input.hasExceededRateLimit) {
    throw new Error('Rate limit exceeded');
  }
}
