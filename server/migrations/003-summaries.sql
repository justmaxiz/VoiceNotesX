CREATE TABLE summary_slots (
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 slot_key text NOT NULL, period jsonb NOT NULL, latest_id uuid,
 PRIMARY KEY(owner_id,slot_key)
);
CREATE TABLE summary_reports (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, slot_key text NOT NULL,
 version integer NOT NULL, fingerprint text NOT NULL, report jsonb NOT NULL,
 generated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,slot_key) REFERENCES summary_slots(owner_id,slot_key) ON DELETE CASCADE,
 UNIQUE(owner_id,slot_key,version), UNIQUE(owner_id,id)
);
ALTER TABLE summary_slots ADD FOREIGN KEY(owner_id,latest_id) REFERENCES summary_reports(owner_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX summary_archive ON summary_reports(owner_id,generated_at DESC,id);
CREATE TABLE summary_jobs (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 slot_key text NOT NULL, fingerprint text NOT NULL, period jsonb NOT NULL, context jsonb NOT NULL,
 trigger text NOT NULL CHECK(trigger IN ('manual','scheduled')),
 stage text NOT NULL DEFAULT 'queued' CHECK(stage IN ('queued','running','completed','error')),
 attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, lease_token uuid, error text, report_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,slot_key,fingerprint),
 FOREIGN KEY(owner_id,report_id) REFERENCES summary_reports(owner_id,id) ON DELETE CASCADE
);
CREATE INDEX summary_queue ON summary_jobs(stage,next_attempt,lease_until);
CREATE INDEX summary_owner_budget ON summary_jobs(owner_id,created_at);
CREATE TABLE summary_settings (
 owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true, time_zone text NOT NULL,
 local_time text NOT NULL DEFAULT '21:00', version integer NOT NULL DEFAULT 1,
 next_run timestamptz NOT NULL, last_local_date date,
 CHECK(local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
CREATE INDEX summary_due ON summary_settings(next_run) WHERE enabled;
