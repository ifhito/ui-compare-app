import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler';
import { registerRoutes, ApiBindings } from './interfaces/http/routes';

export function createApp() {
  const app = new Hono<{ Bindings: ApiBindings; Variables: Record<string, unknown> }>();
  app.use('*', errorHandler);

  registerRoutes(app);

  return app;
}
