import { createClient, Client } from '@libsql/client/web';
import { EnvBindings } from '../../config/env';

export function createTursoClient(env: EnvBindings): Client {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
