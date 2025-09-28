import type { Context, Next } from 'hono';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = error instanceof Error && 'status' in error ? (error as any).status : 500;
    return c.json({ code: 'INTERNAL_ERROR', message }, status);
  }
}
