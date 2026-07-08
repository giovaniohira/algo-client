import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

const USER_ID = 'local'

let db: Database.Database | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'local',
  source TEXT NOT NULL DEFAULT 'leetcode',
  external_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT,
  url TEXT,
  ac_rate REAL,
  starter_code TEXT,
  sample_test_case TEXT,
  question_id INTEGER,
  UNIQUE(user_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'local',
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER,
  outcome TEXT,
  hints_used INTEGER NOT NULL DEFAULT 0,
  max_hint_level INTEGER NOT NULL DEFAULT 0,
  solution_viewed INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL,
  code TEXT,
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  leetcode_submission_id TEXT,
  status TEXT NOT NULL,
  runtime_ms INTEGER,
  memory_kb INTEGER,
  submitted_at TEXT NOT NULL,
  raw_result TEXT,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'local',
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_attempts_problem ON attempts(problem_id);
`

export function initDb(): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  db = new Database(join(dir, 'algo-client.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function insertEvent(type: string, payload: Record<string, unknown> = {}): void {
  getDb()
    .prepare('INSERT INTO events (user_id, type, payload, occurred_at) VALUES (?, ?, ?, ?)')
    .run(USER_ID, type, JSON.stringify(payload), new Date().toISOString())
}

export function getAttemptLanguagesBySlug(): Record<string, string[]> {
  const rows = getDb()
    .prepare(
      `SELECT p.slug, a.language
       FROM attempts a
       JOIN problems p ON p.id = a.problem_id
       GROUP BY p.slug, a.language`
    )
    .all() as Array<{ slug: string; language: string }>

  const map: Record<string, string[]> = {}
  for (const row of rows) {
    if (!map[row.slug]) map[row.slug] = []
    map[row.slug].push(row.language)
  }
  return map
}

export { USER_ID }
