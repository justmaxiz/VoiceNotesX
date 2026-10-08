ALTER TABLE audio_jobs ADD COLUMN processing_context jsonb NOT NULL DEFAULT '{}'
  CHECK (jsonb_typeof(processing_context) = 'object');
