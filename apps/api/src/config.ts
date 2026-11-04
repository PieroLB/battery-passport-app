import { z } from 'zod';

// Variables documented in docs/07-architecture.md. Secrets have no default.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  NEO4J_URI: z.string().min(1).default('bolt://localhost:7687'),
  NEO4J_USER: z.string().min(1).default('neo4j'),
  NEO4J_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  PUBLIC_BASE_URL: z.url(),
  ARCHIVE_DIR: z.string().min(1),
  ARCHIVE_BACKUP_DIR: z.string().min(1),
  SEED_DEFAULT_PASSWORD: z.string().min(1).optional(),
  REUSE_MIN_SOH_PERCENT: z.coerce.number().min(0).max(100).default(70),
  REUSE_MAX_RESISTANCE_FACTOR: z.coerce.number().positive().default(1),
  ARCHIVE_REQUIRES_OWNER_VALIDATION: z.stringbool().default(true),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
