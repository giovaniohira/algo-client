import type { AlgoClientApi } from '../../../preload/index.d'

export function hasApi(): boolean {
  return typeof window.algoClient !== 'undefined'
}

export function api(): AlgoClientApi {
  if (!hasApi()) throw new Error('algoClient unavailable — run via Electron (npm run dev)')
  return window.algoClient
}
