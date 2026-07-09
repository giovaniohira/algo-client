import { app, BrowserWindow, ipcMain, safeStorage, session } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { warmLocalCatalog, invalidateCatalogCache, getLocalTotal, getCatalogSyncedAt } from './platform/local-catalog'
import { maybeSyncCatalog, STALE_MS } from './platform/catalog-sync'
import { applyZoom, attachZoomShortcuts, loadZoomFactor } from './zoom'

const isDev = !app.isPackaged

function broadcastCatalogProgress(progress: { phase: string; done: number; total: number }): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('catalog:sync-progress', progress)
  }
}

function broadcastCatalogDone(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('catalog:sync-done')
  }
}

async function autoSyncCatalog(): Promise<void> {
  try {
    await maybeSyncCatalog(() => {
      const total = getLocalTotal()
      const syncedAt = getCatalogSyncedAt()
      const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > STALE_MS
      return { missing: total === 0, stale: total > 0 && stale }
    }, broadcastCatalogProgress)
    invalidateCatalogCache()
    warmLocalCatalog()
    broadcastCatalogDone()
  } catch {
    // ponytail: stale/missing catalog keeps bundled copy; user can retry manually
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: process.platform === 'darwin',
    autoHideMenuBar: true,
    backgroundColor: '#121212',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    applyZoom(mainWindow, loadZoomFactor())
    mainWindow.show()
  })

  attachZoomShortcuts(mainWindow, (factor) => {
    mainWindow.webContents.send('window:zoom-changed', factor)
  })

  const sendMaximized = (maximized: boolean) => {
    mainWindow.webContents.send('window:maximized', maximized)
  }
  mainWindow.on('maximize', () => sendMaximized(true))
  mainWindow.on('unmaximize', () => sendMaximized(false))

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  warmLocalCatalog()
  registerIpcHandlers()
  createWindow()
  void autoSyncCatalog()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

export { safeStorage, session, ipcMain, BrowserWindow }
