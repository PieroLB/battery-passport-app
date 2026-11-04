import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDriver } from './db/driver.ts';

const config = loadConfig();
const app = buildApp({ config, driver: createDriver(config) });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}

await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
