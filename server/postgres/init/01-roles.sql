\getenv app_password APP_DB_PASSWORD
\getenv migration_password MIGRATION_DB_PASSWORD

CREATE ROLE voicenotes_migrator LOGIN PASSWORD :'migration_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE voicenotes_app LOGIN PASSWORD :'app_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE;

ALTER DATABASE voicenotes_dev OWNER TO voicenotes_migrator;
REVOKE ALL ON DATABASE voicenotes_dev FROM PUBLIC;
GRANT CONNECT ON DATABASE voicenotes_dev TO voicenotes_app;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO voicenotes_migrator;
GRANT USAGE ON SCHEMA public TO voicenotes_app;

ALTER DEFAULT PRIVILEGES FOR ROLE voicenotes_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO voicenotes_app;
ALTER DEFAULT PRIVILEGES FOR ROLE voicenotes_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO voicenotes_app;
