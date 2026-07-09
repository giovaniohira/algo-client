import { BrowserWindow, ipcMain } from 'electron'
import {
  applyZoom,
  attachZoomShortcuts,
  getZoom,
  loadZoomFactor,
  zoomIn,
  zoomOut,
  zoomReset
} from './zoom'
import {
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
} from './platform/adapter'
import {
  isCatalogSyncing,
  syncCatalog,
  STALE_MS,
  type SyncProgress
} from './platform/catalog-sync'
import {
  loadLocalSummaries,
  loadLocalTagOptions,
  getLocalTotal,
  warmLocalCatalog,
  invalidateCatalogCache,
  loadSortedSlugs,
  getCatalogSyncedAt
} from './platform/local-catalog'

function broadcastCatalogProgress(progress: SyncProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('catalog:sync-progress', progress)
  }
}

function broadcastCatalogDone(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('catalog:sync-done')
  }
}

async function requireSession() {
  const sess = await getSession()
  if (!sess) throw new Error('Not authenticated')
  return sess
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

  ipcMain.handle('window:zoom-get', (event) => {
    const win = senderWindow(event)
    return win ? getZoom(win) : loadZoomFactor()
  })

  ipcMain.handle('window:zoom-in', (event) => {
    const win = senderWindow(event)
    if (!win) return loadZoomFactor()
    const factor = zoomIn(win)
    win.webContents.send('window:zoom-changed', factor)
    return factor
  })

  ipcMain.handle('window:zoom-out', (event) => {
    const win = senderWindow(event)
    if (!win) return loadZoomFactor()
    const factor = zoomOut(win)
    win.webContents.send('window:zoom-changed', factor)
    return factor
  })

  ipcMain.handle('window:zoom-reset', (event) => {
    const win = senderWindow(event)
    if (!win) return loadZoomFactor()
    const factor = zoomReset(win)
    win.webContents.send('window:zoom-changed', factor)
    return factor
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
      return { authenticated: false as const, error: 'Session expired' }
    }
  })

  ipcMain.handle('auth:login', async () => {
    const sess = await openLoginWindow()
    resetAdapter()
    const adapter = await getAdapter(sess)
    const profile = await adapter.getProfile()
    storeUsername(profile.username)
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
    return { problem }
  })

  ipcMain.handle('problem:submissions', async (_e, slug: string, limit?: number) => {
    const sess = await requireSession()
    const adapter = await getAdapter(sess)
    return adapter.getSubmissions(slug, limit ?? 50)
  })

  ipcMain.handle('problem:submission-detail', async (_e, id: number) => {
    const sess = await requireSession()
    const adapter = await getAdapter(sess)
    return adapter.getSubmissionDetail(id)
  })

  ipcMain.handle('problem:solutions', async (_e, slug: string, skip?: number, first?: number) => {
    const sess = await requireSession()
    const adapter = await getAdapter(sess)
    return adapter.getSolutionArticles(slug, skip ?? 0, first ?? 20)
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

  ipcMain.handle('problem:tag-options', () => loadLocalTagOptions())

  ipcMain.handle('catalog:status', () => {
    const total = getLocalTotal()
    const syncedAt = getCatalogSyncedAt()
    const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > STALE_MS
    return {
      exists: total > 0,
      syncedAt,
      total,
      stale,
      syncing: isCatalogSyncing()
    }
  })

  ipcMain.handle('catalog:sync', async () => {
    const catalog = await syncCatalog({}, broadcastCatalogProgress)
    invalidateCatalogCache()
    warmLocalCatalog()
    broadcastCatalogDone()
    return { total: catalog.total, syncedAt: catalog.syncedAt }
  })

  ipcMain.handle('catalog:slugs', () => loadSortedSlugs())

  ipcMain.handle(
    'judge:run',
    async (_e, slug: string, questionId: number, lang: string, code: string, dataInput: string) => {
      const sess = await requireSession()
      const adapter = await getAdapter(sess)
      return adapter.runCode(slug, questionId, lang, code, dataInput)
    }
  )

  ipcMain.handle(
    'judge:submit',
    async (_e, slug: string, questionId: number, lang: string, code: string) => {
      const sess = await requireSession()
      const adapter = await getAdapter(sess)
      const result = await adapter.submitCode(slug, questionId, lang, code)
      const outcome = outcomeFromResult(result)
      return { result, outcome }
    }
  )
}

export { loadSession }
