import { BrowserWindow, ipcMain } from 'electron'
import { getDb, getAttemptLanguagesBySlug, insertEvent } from './db'
import {
  clearSession,
  getSession,
  invalidateStoredSession,
  loadSession,
  logout,
  openLoginWindow,
  storeUsername
} from './auth'
import {
  getAdapter,
  outcomeFromResult,
  resetAdapter,
  type ProblemDetail
} from './leetcode/adapter'
import { loadLocalSummaries, loadLocalTagOptions, getLocalTotal, warmLocalCatalog } from './leetcode/local-catalog'
import {
  elapsedSeconds,
  finishAttempt,
  getActiveAttempt,
  recordHint,
  recordSolutionViewed,
  startAttempt,
  updateCode
} from './session-recorder'

async function requireSession() {
  const sess = await getSession()
  if (!sess) throw new Error('Não autenticado')
  return sess
}

function upsertProblem(p: ProblemDetail): number {
  const existing = getDb()
    .prepare('SELECT id FROM problems WHERE user_id = ? AND source = ? AND external_id = ?')
    .get('local', 'leetcode', p.questionId) as { id: number } | undefined

  if (existing) {
    getDb()
      .prepare(
        `UPDATE problems SET slug = ?, title = ?, difficulty = ?, url = ?, ac_rate = ?,
         starter_code = ?, sample_test_case = ?, question_id = ? WHERE id = ?`
      )
      .run(
        p.slug,
        p.title,
        p.difficulty,
        `https://leetcode.com/problems/${p.slug}/`,
        p.acRate,
        JSON.stringify(p.codeSnippets),
        p.sampleTestCase,
        parseInt(p.questionId, 10),
        existing.id
      )
    return existing.id
  }

  const result = getDb()
    .prepare(
      `INSERT INTO problems (user_id, source, external_id, slug, title, difficulty, url, ac_rate, starter_code, sample_test_case, question_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      'local',
      'leetcode',
      p.questionId,
      p.slug,
      p.title,
      p.difficulty,
      `https://leetcode.com/problems/${p.slug}/`,
      p.acRate,
      JSON.stringify(p.codeSnippets),
      p.sampleTestCase,
      parseInt(p.questionId, 10)
    )
  return Number(result.lastInsertRowid)
}

function senderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(): void {
  ipcMain.handle('window:minimize', (event) => {
    senderWindow(event)?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = senderWindow(event)
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
      return false
    }
    win.maximize()
    return true
  })

  ipcMain.handle('window:close', (event) => {
    senderWindow(event)?.close()
  })

  ipcMain.handle('window:isMaximized', (event) => {
    return senderWindow(event)?.isMaximized() ?? false
  })

  ipcMain.handle('auth:status', async () => {
    const sess = await getSession()
    if (!sess) return { authenticated: false as const }
    try {
      const adapter = await getAdapter(sess)
      const profile = await adapter.getProfile()
      storeUsername(profile.username)
      return { authenticated: true as const, profile }
    } catch {
      invalidateStoredSession()
      resetAdapter()
      return { authenticated: false as const, error: 'Sessão expirada' }
    }
  })

  ipcMain.handle('auth:login', async () => {
    const sess = await openLoginWindow()
    resetAdapter()
    const adapter = await getAdapter(sess)
    const profile = await adapter.getProfile()
    storeUsername(profile.username)
    insertEvent('sync_completed', { source: 'login' })
    return profile
  })

  ipcMain.handle('auth:logout', async () => {
    await logout()
    resetAdapter()
    return { ok: true }
  })

  ipcMain.handle('problem:load', async (_e, slug: string) => {
    const sess = await requireSession()
    const adapter = await getAdapter(sess)
    const problem = await adapter.getProblem(slug)
    const problemId = upsertProblem(problem)
    return { problem, problemId }
  })

  ipcMain.handle(
    'problem:list',
    (_e, opts?: { search?: string; offset?: number; limit?: number }) => {
      const questions = loadLocalSummaries(opts?.limit)
      return { total: getLocalTotal(), hasMore: false, questions }
    }
  )

  ipcMain.handle('problem:sync-status', async () => {
    try {
      const sess = await requireSession()
      const adapter = await getAdapter(sess)
      return adapter.syncStatuses()
    } catch {
      return {}
    }
  })

  ipcMain.handle('problem:attempt-languages', () => {
    try {
      return getAttemptLanguagesBySlug()
    } catch {
      return {}
    }
  })

  ipcMain.handle('problem:tag-options', () => loadLocalTagOptions())

  ipcMain.handle('session:start', (_e, problemId: number, language: string, code: string) => {
    const attempt = startAttempt(problemId, language, code)
    return { attemptId: attempt.id }
  })

  ipcMain.handle('session:hint', (_e, level: number) => {
    recordHint(level)
    return { ok: true }
  })

  ipcMain.handle('session:solution-viewed', () => {
    recordSolutionViewed()
    return { ok: true }
  })

  ipcMain.handle('session:elapsed', () => elapsedSeconds())

  ipcMain.handle(
    'leetcode:run',
    async (_e, slug: string, questionId: number, lang: string, code: string, dataInput: string) => {
      const sess = await requireSession()
      const adapter = await getAdapter(sess)
      updateCode(code)
      insertEvent('code_run', { slug })
      const result = await adapter.runCode(slug, questionId, lang, code, dataInput)
      return result
    }
  )

  ipcMain.handle(
    'leetcode:submit',
    async (_e, slug: string, questionId: number, lang: string, code: string, problemId: number) => {
      const sess = await requireSession()
      const adapter = await getAdapter(sess)
      updateCode(code)

      if (!getActiveAttempt()) {
        startAttempt(problemId, lang, code)
      }

      const result = await adapter.submitCode(slug, questionId, lang, code)
      const outcome = outcomeFromResult(result)
      finishAttempt(result, outcome)
      return { result, outcome }
    }
  )
}

export { loadSession }
