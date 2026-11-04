import { describe, expect, it } from 'vitest';
import type { Driver } from 'neo4j-driver';
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig({
  NODE_ENV: 'test',
  NEO4J_PASSWORD: 'test',
  JWT_SECRET: 'x'.repeat(32),
  PUBLIC_BASE_URL: 'http://localhost:3000',
  ARCHIVE_DIR: '/tmp/a',
  ARCHIVE_BACKUP_DIR: '/tmp/b',
});

const fakeDriver = (up: boolean) =>
  ({
    getServerInfo: async () => {
      if (!up) throw new Error('down');
      return {};
    },
    close: async () => {},
  }) as unknown as Driver;

describe('GET /health', () => {
  it('returns 200 when Neo4j is up', async () => {
    const app = buildApp({ config, driver: fakeDriver(true) });
    const res = await app.inject('/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', neo4j: 'up' });
    await app.close();
  });

  it('returns 503 when Neo4j is down', async () => {
    const app = buildApp({ config, driver: fakeDriver(false) });
    const res = await app.inject('/health');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'degraded', neo4j: 'down' });
    await app.close();
  });
});

describe('loadConfig', () => {
  it('rejects a missing secret', () => {
    expect(() => loadConfig({ PUBLIC_BASE_URL: 'http://x' })).toThrow(/JWT_SECRET/);
  });
});
