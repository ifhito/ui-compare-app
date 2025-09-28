import type { Context, Next } from 'hono';
import { FirebaseAuthVerifier, FirebaseUser } from '../infrastructure/auth/firebase-auth-verifier';

export const AUTH_USER_KEY = 'authUser';

export function authMiddleware(verifier: FirebaseAuthVerifier) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ code: 'unauthorized', message: 'Authorization header missing' }, 401);
    }

    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const user = await verifier.verify(token);
      c.set<FirebaseUser>(AUTH_USER_KEY, user);
      return next();
    } catch (error) {
      console.error('Auth verification failed', error);
      return c.json({ code: 'unauthorized', message: 'Invalid credentials' }, 401);
    }
  };
}

export function getAuthUser(c: Context): FirebaseUser | undefined {
  return c.get<FirebaseUser>(AUTH_USER_KEY);
}
