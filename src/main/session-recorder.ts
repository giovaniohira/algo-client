import { getDb, insertEvent, USER_ID } from './db'
import type { JudgeResult } from './leetcode/adapter'

export interface ActiveAttempt {
  id: number
  problemId: number
  startedAt: Date
  hintsUsed: number
  maxHintLevel: number
  solutionViewed: boolean
  language: string
  code: string
}

let active: ActiveAttempt | null = null

export function startAttempt(problemId: number, language: string, code: string): ActiveAttempt {
  const startedAt = new Date()
  const result = getDb()
    .prepare(
      `INSERT INTO attempts (user_id, problem_id, started_at, language, code, hints_used, max_hint_level, solution_viewed)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0)`
    )
    .run(USER_ID, problemId, startedAt.toISOString(), language, code)

  active = {
    id: Number(result.lastInsertRowid),
    problemId,
    startedAt,
    hintsUsed: 0,
    maxHintLevel: 0,
    solutionViewed: false,
    language,
    code
  }

  insertEvent('attempt_started', { attemptId: active.id, problemId })
  return active
}

export function getActiveAttempt(): ActiveAttempt | null {
  return active
}

export function recordHint(level: number): void {
  if (!active) return
  active.hintsUsed += 1
  active.maxHintLevel = Math.max(active.maxHintLevel, level)
  getDb()
    .prepare('UPDATE attempts SET hints_used = ?, max_hint_level = ? WHERE id = ?')
    .run(active.hintsUsed, active.maxHintLevel, active.id)
  insertEvent('hint_requested', { attemptId: active.id, level })
}

export function recordSolutionViewed(): void {
  if (!active) return
  active.solutionViewed = true
  getDb().prepare('UPDATE attempts SET solution_viewed = 1 WHERE id = ?').run(active.id)
  insertEvent('solution_viewed', { attemptId: active.id })
}

export function updateCode(code: string): void {
  if (!active) return
  active.code = code
  getDb().prepare('UPDATE attempts SET code = ? WHERE id = ?').run(code, active.id)
}

export function finishAttempt(result: JudgeResult, outcome: string): void {
  if (!active) return
  const endedAt = new Date()
  const durationSec = Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000)

  getDb()
    .prepare(
      `UPDATE attempts SET ended_at = ?, duration_sec = ?, outcome = ? WHERE id = ?`
    )
    .run(endedAt.toISOString(), durationSec, outcome, active.id)

  getDb()
    .prepare(
      `INSERT INTO submissions (attempt_id, leetcode_submission_id, status, runtime_ms, memory_kb, submitted_at, raw_result)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      active.id,
      result.submissionId ?? null,
      result.statusMsg,
      result.runtimeMs ?? null,
      result.memoryKb ?? null,
      endedAt.toISOString(),
      JSON.stringify(result)
    )

  insertEvent('attempt_submitted', {
    attemptId: active.id,
    outcome,
    durationSec,
    status: result.statusMsg
  })

  if (outcome === 'accepted') {
    insertEvent('attempt_accepted', { attemptId: active.id, durationSec })
  }

  active = null
}

export function elapsedSeconds(): number {
  if (!active) return 0
  return Math.round((Date.now() - active.startedAt.getTime()) / 1000)
}
