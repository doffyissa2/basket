-- scan_jobs: async receipt scanning pipeline
-- Stores pending/processing/done scan jobs so the client can poll for results
-- instead of blocking for 30-60s on the Sonnet Vision call.
--
-- Rows are ephemeral — cleaned up by the cleanup-old-data cron after 1 hour.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS scan_jobs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  image_hash TEXT NOT NULL,
  image_data JSONB NOT NULL,            -- [{base64, mediaType}], cleared after processing
  result     JSONB,                     -- full ParsedReceipt when status = 'done'
  error_msg  TEXT,                      -- populated when status = 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_status ON scan_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_pending ON scan_jobs(status) WHERE status = 'pending';

-- RLS: users can only read their own jobs
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scan_jobs" ON scan_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Note: the service_role client (used by process-scan worker) bypasses RLS
-- automatically, so no additional policy is needed for the background worker.
