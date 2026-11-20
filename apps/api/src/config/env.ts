import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Comma-separated list of allowed browser origins, e.g. "http://localhost:3000"
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  // Reverse proxies in front of the API (Coolify/Traefik = 1), so rate limits
  // and logs see the visitor's IP instead of the proxy's. 0 = none (local dev).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Comma-separated Google OAuth client IDs (web, Android, iOS) whose ID tokens
  // we accept. Empty = Google sign-in disabled.
  GOOGLE_CLIENT_IDS: z.string().default(''),
  // UploadThing server token for product photos. Empty = uploads disabled.
  UPLOADTHING_TOKEN: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  const env = result.data;
  if (env.NODE_ENV === 'production') {
    // Refuse to start with values copied from .env.example or dev defaults.
    if (/change-me/i.test(env.JWT_SECRET)) {
      throw new Error('JWT_SECRET is still the example value; generate a real secret.');
    }
    if (/localhost|127\.0\.0\.1/.test(env.CORS_ORIGINS)) {
      throw new Error('CORS_ORIGINS points at localhost; set the production web origins.');
    }
  }
  return env;
}
