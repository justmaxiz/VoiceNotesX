import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type pg from 'pg';
import type { ServerConfig } from './config.js';
import { ApiError } from './errors.js';
import { transaction } from './database.js';
const scrypt = promisify(scryptCallback);
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const cookieName = 'vn_refresh';
const WEB_REFRESH_GRACE_MS = 5000;
declare module 'fastify' {
  interface FastifyRequest {
    ownerId: string;
  }
}
export async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString('hex')}`;
}
export async function passwordMatches(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, value] = stored.split(':');
  const candidate = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(value, 'hex');
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
export function authentication(pool: pg.Pool, config: ServerConfig) {
  const key = new TextEncoder().encode(config.jwtSecret);
  const access = (owner: string) =>
    new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(owner)
      .setIssuer('voicenotes')
      .setAudience('voicenotes-clients')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key);
  const requireUser = async (request: FastifyRequest) => {
    try {
      const token = /^Bearer (\S+)$/.exec(
        request.headers.authorization || '',
      )?.[1];
      if (!token) throw new Error();
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
        issuer: 'voicenotes',
        audience: 'voicenotes-clients',
      });
      if (!payload.sub || !/^[0-9a-f-]{36}$/i.test(payload.sub))
        throw new Error();
      request.ownerId = payload.sub;
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Войдите в аккаунт.');
    }
  };
  const requireMediaUser = async (request: FastifyRequest) => {
    if (request.headers.authorization) return requireUser(request);
    const token = request.cookies[cookieName];
    const result = token
      ? await pool.query(
          'SELECT owner_id FROM sessions WHERE refresh_hash=$1 AND revoked_at IS NULL AND expires_at>now()',
          [hash(token)],
        )
      : { rows: [] };
    if (!result.rows.length)
      throw new ApiError(401, 'UNAUTHORIZED', 'Войдите в аккаунт.');
    request.ownerId = result.rows[0].owner_id;
  };
  const checkOrigin = (request: FastifyRequest) => {
    if (
      !request.headers.origin ||
      !config.corsOrigins.includes(request.headers.origin)
    )
      throw new ApiError(403, 'CSRF', 'Недопустимый Origin.');
  };
  const setCookie = (reply: FastifyReply, token: string) =>
    reply.setCookie(cookieName, token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/api/v1',
      maxAge: 30 * 86400,
    });
  const newSession = async (
    client: pg.PoolClient,
    owner: string,
    family = randomUUID(),
  ) => {
    const refreshToken = randomBytes(48).toString('base64url');
    await client.query(
      "INSERT INTO sessions(id,owner_id,family_id,refresh_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '30 days')",
      [randomUUID(), owner, family, hash(refreshToken)],
    );
    return refreshToken;
  };
  const credentials = {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        maxLength: 254,
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      },
      password: { type: 'string', minLength: 10, maxLength: 256 },
      platform: { type: 'string', enum: ['web', 'expo'] },
    },
  };
  const register = (app: FastifyInstance) => {
    for (const mode of ['register', 'login'] as const)
      app.post(
        `/api/v1/auth/${mode}`,
        {
          schema: { body: credentials },
          config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        },
        async (request, reply) => {
          const {
            email: rawEmail,
            password,
            platform = 'web',
          } = request.body as {
            email: string;
            password: string;
            platform?: string;
          };
          if (platform === 'web') checkOrigin(request);
          const email = rawEmail.toLowerCase().trim();
          const found = await pool.query(
            'SELECT id,email,password_hash FROM users WHERE email=$1',
            [email],
          );
          let user = found.rows[0];
          if (mode === 'register') {
            if (user)
              throw new ApiError(
                409,
                'ACCOUNT_EXISTS',
                'Невозможно зарегистрировать этот адрес.',
              );
            user = {
              id: randomUUID(),
              email,
              password_hash: await passwordHash(password),
            };
            try {
              await pool.query(
                'INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',
                [user.id, email, user.password_hash],
              );
            } catch (error) {
              if ((error as { code?: string }).code === '23505')
                throw new ApiError(
                  409,
                  'ACCOUNT_EXISTS',
                  'Невозможно зарегистрировать этот адрес.',
                );
              throw error;
            }
          } else {
            const dummy = '0'.repeat(64) + ':' + '0'.repeat(128);
            const matches = await passwordMatches(
              password,
              user?.password_hash || dummy,
            );
            if (!user || !matches)
              throw new ApiError(
                401,
                'INVALID_CREDENTIALS',
                'Неверный email или пароль.',
              );
          }
          const refreshToken = await transaction(pool, (client) =>
            newSession(client, user.id),
          );
          if (platform === 'web') setCookie(reply, refreshToken);
          return {
            accessToken: await access(user.id),
            user: { id: user.id, email: user.email },
            ...(platform === 'expo' ? { refreshToken } : {}),
          };
        },
      );
    app.post(
      '/api/v1/auth/refresh',
      { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
      async (request, reply) => {
        const body = (request.body || {}) as { refreshToken?: string };
        const web = !body.refreshToken;
        if (web) checkOrigin(request);
        const token = web ? request.cookies[cookieName] : body.refreshToken;
        if (!token || typeof token !== 'string')
          throw new ApiError(401, 'UNAUTHORIZED', 'Сессия истекла.');
        const result = await transaction(pool, async (client) => {
          const found = await client.query(
            'SELECT * FROM sessions WHERE refresh_hash=$1 FOR UPDATE',
            [hash(token)],
          );
          const session = found.rows[0];
          if (!session) return null;
          if (session.revoked_at) {
            const rotatedAt = session.rotated_at && new Date(session.rotated_at).getTime();
            if (web && rotatedAt && Date.now() - rotatedAt <= WEB_REFRESH_GRACE_MS) {
              const active = await client.query(
                'SELECT 1 FROM sessions WHERE family_id=$1 AND revoked_at IS NULL AND expires_at>now() LIMIT 1',
                [session.family_id],
              );
              if (active.rows.length) {
                const refreshToken = await newSession(client, session.owner_id, session.family_id);
                const user = (
                  await client.query('SELECT id,email FROM users WHERE id=$1', [session.owner_id])
                ).rows[0];
                return { refreshToken, user };
              }
            }
            await client.query(
              'UPDATE sessions SET revoked_at=now() WHERE family_id=$1',
              [session.family_id],
            );
            return null;
          }
          if (new Date(session.expires_at).getTime() <= Date.now()) return null;
          await client.query(
            'UPDATE sessions SET revoked_at=now(),rotated_at=now() WHERE id=$1',
            [session.id],
          );
          const refreshToken = await newSession(
            client,
            session.owner_id,
            session.family_id,
          );
          const user = (
            await client.query('SELECT id,email FROM users WHERE id=$1', [
              session.owner_id,
            ])
          ).rows[0];
          return { refreshToken, user };
        });
        if (!result) {
          reply.clearCookie(cookieName, { path: '/api/v1' });
          throw new ApiError(401, 'UNAUTHORIZED', 'Сессия истекла.');
        }
        if (web) setCookie(reply, result.refreshToken);
        return {
          accessToken: await access(result.user.id),
          user: result.user,
          ...(!web ? { refreshToken: result.refreshToken } : {}),
        };
      },
    );
    app.post('/api/v1/auth/logout', async (request, reply) => {
      const body = (request.body || {}) as { refreshToken?: string };
      if (!body.refreshToken) checkOrigin(request);
      const token = body.refreshToken || request.cookies[cookieName];
      if (typeof token === 'string')
        await pool.query(
          'UPDATE sessions SET revoked_at=now() WHERE family_id IN (SELECT family_id FROM sessions WHERE refresh_hash=$1)',
          [hash(token)],
        );
      reply.clearCookie(cookieName, { path: '/api/v1' });
      return { status: 'ok' };
    });
    app.get(
      '/api/v1/auth/me',
      { preHandler: requireUser },
      async (request) => ({
        user: (
          await pool.query('SELECT id,email FROM users WHERE id=$1', [
            request.ownerId,
          ])
        ).rows[0],
      }),
    );
  };
  return { requireUser, requireMediaUser, register };
}
