import Fastify from 'fastify';
import type { Driver } from 'neo4j-driver';
import type { Config } from './config.ts';
import { healthRoutes } from './modules/health/routes.ts';

export function buildApp({ config, driver }: { config: Config; driver: Driver }) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: 'info' },
  });
  app.addHook('onClose', () => driver.close());
  app.register(healthRoutes, { driver });
  return app;
}
