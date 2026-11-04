import neo4j, { type Driver } from 'neo4j-driver';
import type { Config } from '../config.ts';

export function createDriver(config: Config): Driver {
  return neo4j.driver(
    config.NEO4J_URI,
    neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
    {
      // Fail fast so /health answers quickly when Neo4j is down.
      connectionTimeout: 3000,
      connectionAcquisitionTimeout: 3000,
    },
  );
}
