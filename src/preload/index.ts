import { contextBridge, ipcRenderer } from 'electron'
import type { AlgoClientApi } from './index.d'

const api: AlgoClientApi = {
  authStatus: () => ipcRenderer.invoke('auth:status'),
  authLogin: () => ipcRenderer.invoke('auth:login'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  loadProblem: (slug) => ipcRenderer.invoke('problem:load', slug),
  listProblems: (opts) => ipcRenderer.invoke('problem:list', opts),
  syncProblemStatuses: () => ipcRenderer.invoke('problem:sync-status'),
  attemptLanguages: () => ipcRenderer.invoke('problem:attempt-languages'),
  tagOptions: () => ipcRenderer.invoke('problem:tag-options'),
  startSession: (problemId, language, code) =>
    ipcRenderer.invoke('session:start', problemId, language, code),
  recordHint: (level) => ipcRenderer.invoke('session:hint', level),
  recordSolutionViewed: () => ipcRenderer.invoke('session:solution-viewed'),
  getElapsed: () => ipcRenderer.invoke('session:elapsed'),
  runCode: (slug, questionId, lang, code, dataInput) =>
    ipcRenderer.invoke('leetcode:run', slug, questionId, lang, code, dataInput),
  submitCode: (slug, questionId, lang, code, problemId) =>
    ipcRenderer.invoke('leetcode:submit', slug, questionId, lang, code, problemId),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (callback) => {
    const listener = (_: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximized', listener)
    return () => ipcRenderer.removeListener('window:maximized', listener)
  }
}

contextBridge.exposeInMainWorld('algoClient', api)
