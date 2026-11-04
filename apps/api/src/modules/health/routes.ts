import type { FastifyPluginAsync } from 'fastify';
import type { Driver } from 'neo4j-driver';

export const healthRoutes: FastifyPluginAsync<{ driver: Driver }> = async (app, { driver }) => {
  // Public route (no role): used by Docker HEALTHCHECK and the deploy job.
  app.get('/health', async (req, reply) => {
    try {
      await driver.getServerInfo();
      return { status: 'ok', neo4j: 'up' };
    } catch (err) {
      req.log.warn({ err }, 'Neo4j unreachable');
      return reply.code(503).send({ status: 'degraded', neo4j: 'down' });
    }
  });
};
