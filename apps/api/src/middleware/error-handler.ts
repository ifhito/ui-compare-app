import type { Context, Next } from 'hono';
import { ApplicationError, DomainError } from '../application/errors';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error(error);

    if (error instanceof DomainError) {
      const status = mapDomainErrorToStatus(error.code);
      return c.json({ code: error.code, message: error.message }, status);
    }

    if (error instanceof ApplicationError) {
      return c.json({ code: error.code, message: error.message }, 400);
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return c.json({ code: 'INTERNAL_ERROR', message }, 500);
  }
}

function mapDomainErrorToStatus(code: string): number {
  if (code.includes('not_found')) return 404;
  if (code.includes('forbidden')) return 403;
  if (code.includes('duplicate') || code.includes('conflict')) return 409;
  return 400;
}
