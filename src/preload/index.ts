import { contextBridge, ipcRenderer } from 'electron'
import type { AlgoClientApi, CatalogSyncProgress } from './index.d'

const api: AlgoClientApi = {
  authStatus: () => ipcRenderer.invoke('auth:status'),
  authLogin: () => ipcRenderer.invoke('auth:login'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  loadProblem: (slug) => ipcRenderer.invoke('problem:load', slug),
  listSubmissions: (slug, limit) => ipcRenderer.invoke('problem:submissions', slug, limit),
  loadSubmissionDetail: (id) => ipcRenderer.invoke('problem:submission-detail', id),
  listSolutions: (slug, skip, first) => ipcRenderer.invoke('problem:solutions', slug, skip, first),
  listProblems: (opts) => ipcRenderer.invoke('problem:list', opts),
  syncProblemStatuses: () => ipcRenderer.invoke('problem:sync-status'),
  tagOptions: () => ipcRenderer.invoke('problem:tag-options'),
  catalogStatus: () => ipcRenderer.invoke('catalog:status'),
  syncCatalog: () => ipcRenderer.invoke('catalog:sync'),
  catalogSlugs: () => ipcRenderer.invoke('catalog:slugs'),
  onCatalogSyncProgress: (callback) => {
    const listener = (_: Electron.IpcRendererEvent, progress: CatalogSyncProgress) => callback(progress)
    ipcRenderer.on('catalog:sync-progress', listener)
    return () => ipcRenderer.removeListener('catalog:sync-progress', listener)
  },
  onCatalogSyncDone: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('catalog:sync-done', listener)
    return () => ipcRenderer.removeListener('catalog:sync-done', listener)
  },
  runCode: (slug, questionId, lang, code, dataInput) =>
    ipcRenderer.invoke('judge:run', slug, questionId, lang, code, dataInput),
  submitCode: (slug, questionId, lang, code) =>
    ipcRenderer.invoke('judge:submit', slug, questionId, lang, code),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  zoomGet: () => ipcRenderer.invoke('window:zoom-get'),
  zoomIn: () => ipcRenderer.invoke('window:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('window:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('window:zoom-reset'),
  onZoomChanged: (callback) => {
    const listener = (_: Electron.IpcRendererEvent, factor: number) => callback(factor)
    ipcRenderer.on('window:zoom-changed', listener)
    return () => ipcRenderer.removeListener('window:zoom-changed', listener)
  },
  onWindowMaximized: (callback) => {
    const listener = (_: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximized', listener)
    return () => ipcRenderer.removeListener('window:maximized', listener)
  }
}

contextBridge.exposeInMainWorld('algoClient', api)
