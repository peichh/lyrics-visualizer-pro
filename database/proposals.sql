CREATE TABLE IF NOT EXISTS ai_proposals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  changes TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ai_proposals_project ON ai_proposals(project_id, status);
