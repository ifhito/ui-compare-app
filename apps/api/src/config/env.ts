export interface EnvBindings {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  STACKBLITZ_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
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

  return resolved as EnvBindings;
}
