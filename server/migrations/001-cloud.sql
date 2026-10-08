CREATE TABLE users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 family_id uuid NOT NULL, refresh_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_owner ON sessions(owner_id);
CREATE INDEX sessions_family ON sessions(family_id);
CREATE TABLE audio_sources (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 file_key text NOT NULL UNIQUE, filename text NOT NULL, mime_type text NOT NULL,
 size_bytes bigint NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 104857600),
 duration_seconds double precision NOT NULL CHECK(duration_seconds > 0 AND duration_seconds <= 7200),
 temporary boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL,
 expired_at timestamptz, legacy_id text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id, id), UNIQUE(owner_id, legacy_id)
);
CREATE INDEX audio_expiration ON audio_sources(expires_at) WHERE expired_at IS NULL;
CREATE TABLE notes (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 data jsonb NOT NULL CHECK(jsonb_typeof(data) = 'object')
   CHECK(data ?& ARRAY['title','status','priority','categoryTag','isFocus'])
   CHECK(jsonb_typeof(data->'title') = 'string' AND jsonb_typeof(data->'status') = 'string'
     AND jsonb_typeof(data->'priority') = 'string' AND jsonb_typeof(data->'categoryTag') = 'string')
   CHECK(jsonb_typeof(data->'isFocus') = 'boolean')
   CHECK(length(btrim(data->>'title')) BETWEEN 1 AND 500)
   CHECK(data->>'status' IN ('todo','in_progress','completed','archived'))
   CHECK(data->>'priority' IN ('low','medium','high')),
 audio_id uuid, legacy_id text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id, legacy_id), FOREIGN KEY(owner_id,audio_id) REFERENCES audio_sources(owner_id,id)
);
CREATE INDEX notes_owner_updated ON notes(owner_id,updated_at DESC,id);
CREATE INDEX notes_schedule ON notes(owner_id,(data->>'dueDate'));
CREATE TABLE audio_jobs (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 audio_id uuid NOT NULL, stage text NOT NULL CHECK(stage IN ('queued','transcribing','analyzing','completed','error')),
 transcript text NOT NULL DEFAULT '', summary text NOT NULL DEFAULT '', candidates jsonb NOT NULL DEFAULT '[]',
 error text, approved_at timestamptz, approved_ids jsonb, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,audio_id) REFERENCES audio_sources(owner_id,id)
);
CREATE INDEX jobs_pending ON audio_jobs(stage,lease_until);
