export type NodeEnvironment = 'development' | 'test' | 'production';

export interface ServerConfig {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  corsOrigins: string[];
  databaseUrl: string;
  jwtSecret: string;
  audioStoragePath: string;
  aiProvider: 'gemini' | 'alice';
  geminiKey?: string;
  geminiModel?: string;
  yandexKey?: string;
  yandexFolder?: string;
}

const DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const host =
    env.HOST?.trim() || (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1');
  const rawOrigins =
    env.CORS_ORIGINS === undefined
      ? nodeEnv === 'production'
        ? []
        : DEVELOPMENT_ORIGINS
      : env.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  if (nodeEnv === 'production' && rawOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set explicitly in production.');
  }

  const corsOrigins = rawOrigins.map((origin) =>
    validateOrigin(origin, nodeEnv),
  );
  if (new Set(corsOrigins).size !== corsOrigins.length) {
    throw new Error('CORS_ORIGINS must not contain duplicates.');
  }

  return {
    nodeEnv: nodeEnv as NodeEnvironment,
    host,
    port,
    corsOrigins,
    databaseUrl: databaseUrl(env.DATABASE_URL, 'DATABASE_URL'),
    jwtSecret: secret(env.JWT_SECRET),
    audioStoragePath: env.AUDIO_STORAGE_PATH || '.local/audio',
    ...aiConfig(env, nodeEnv),
  };
}

export function databaseUrl(value: string | undefined, name: string): string {
  try {
    const url = new URL(value || '');
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname.slice(1)
    )
      throw new Error();
  } catch {
    throw new Error(`${name} must be a PostgreSQL URL.`);
  }
  return value!;
}
function secret(value?: string): string {
  if (!value || Buffer.byteLength(value) < 32)
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  return value;
}
export function aiConfig(env: NodeJS.ProcessEnv, nodeEnv: string) {
  const provider =
    env.AI_PROVIDER || (nodeEnv === 'production' ? '' : 'gemini');
  if (!['gemini', 'alice'].includes(provider))
    throw new Error('AI_PROVIDER must be gemini or alice.');
  if (nodeEnv === 'production' && provider !== 'alice')
    throw new Error('Production requires Alice AI; Gemini is prohibited.');
  if (
    nodeEnv === 'production' &&
    (!env.YANDEX_API_KEY || !env.YANDEX_FOLDER_ID)
  )
    throw new Error('Production requires YANDEX_API_KEY and YANDEX_FOLDER_ID.');
  return {
    aiProvider: provider as 'gemini' | 'alice',
    geminiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    yandexKey: env.YANDEX_API_KEY,
    yandexFolder: env.YANDEX_FOLDER_ID,
  };
}

function validateOrigin(origin: string, nodeEnv: string): string {
  if (origin === '*') {
    throw new Error('Wildcard CORS origins are not allowed.');
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`CORS origin must be an absolute URL: ${origin}`);
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.origin !== origin.replace(/\/$/, '')
  ) {
    throw new Error(
      `CORS origin must contain only scheme, host, and optional port: ${origin}`,
    );
  }

  if (nodeEnv === 'production' && parsed.protocol !== 'https:') {
    throw new Error(`Production CORS origins must use HTTPS: ${origin}`);
  }

  return parsed.origin;
}
