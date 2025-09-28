import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler';
import { registerBaseRoutes } from './interfaces/http/routes';

export function createApp() {
  const app = new Hono();
  app.use('*', errorHandler);

  registerBaseRoutes(app);

  return app;
}
