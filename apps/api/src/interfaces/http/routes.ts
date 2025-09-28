import { Hono } from 'hono';

export function registerBaseRoutes(app: Hono) {
  app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
}
