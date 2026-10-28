CREATE TABLE IF NOT EXISTS whisper_track_usage (
  day TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  songs INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id)
);
