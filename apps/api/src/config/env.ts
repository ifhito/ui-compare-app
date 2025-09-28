export interface EnvBindings {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  STACKBLITZ_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_AUTH_EMULATOR?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export function resolveEnv(env: Partial<EnvBindings> & Record<string, string | undefined>): EnvBindings {
  const required: (keyof EnvBindings)[] = [
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "STACKBLITZ_WEBHOOK_SECRET",
    "FIREBASE_PROJECT_ID"
  ];

  const resolved: Record<string, string> = {};

  for (const key of required) {
    const value = env[key];
    if (value == null) {
      throw new Error(`Missing required env variable: ${key}`);
    }
    resolved[key] = value;
  }

  const optionalKeys: (keyof EnvBindings)[] = [
    "FIREBASE_WEB_API_KEY",
    "FIREBASE_AUTH_EMULATOR",
    "TURNSTILE_SECRET_KEY"
  ];

  for (const key of optionalKeys) {
    const value = env[key];
    if (value != null) {
      resolved[key] = value;
    }
  }

  return resolved as EnvBindings;
}
