import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { databaseUrl } from './config.js';
export async function migrate(
  connectionString: string,
  directory = resolve('migrations'),
) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(451048)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const version of (await readdir(directory))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const sql = await readFile(resolve(directory, version), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE version=$1',
        [version],
      );
      if (applied.rows.length) {
        if (applied.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${version}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)',
          [version, checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(451048)').catch(() => {});
    await client.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  migrate(
    databaseUrl(process.env.MIGRATION_DATABASE_URL, 'MIGRATION_DATABASE_URL'),
  ).catch(() => {
    process.stderr.write(
      'Migration failed. Check database configuration and migration files.\n',
    );
    process.exitCode = 1;
  });
}
