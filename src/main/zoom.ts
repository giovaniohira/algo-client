import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export const ZOOM_STEP = 0.1
export const ZOOM_MIN = 0.75
export const ZOOM_MAX = 1.75
export const ZOOM_DEFAULT = 1

function zoomPath(): string {
  return join(app.getPath('userData'), 'zoom-factor.json')
}

export function clampZoom(factor: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(factor * 100) / 100))
}

export function loadZoomFactor(): number {
  try {
    const path = zoomPath()
    if (!existsSync(path)) return ZOOM_DEFAULT
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { factor?: number }
    return clampZoom(data.factor ?? ZOOM_DEFAULT)
  } catch {
    return ZOOM_DEFAULT
  }
}

function saveZoomFactor(factor: number): void {
  try {
    writeFileSync(zoomPath(), JSON.stringify({ factor: clampZoom(factor) }))
  } catch {
    // ponytail: ignore write failures
  }
}

export function getZoom(win: BrowserWindow): number {
  return win.webContents.getZoomFactor()
}

export function applyZoom(win: BrowserWindow, factor: number): number {
  const next = clampZoom(factor)
  win.webContents.setZoomFactor(next)
  saveZoomFactor(next)
  return next
}

export function zoomIn(win: BrowserWindow): number {
  return applyZoom(win, getZoom(win) + ZOOM_STEP)
}

export function zoomOut(win: BrowserWindow): number {
  return applyZoom(win, getZoom(win) - ZOOM_STEP)
}

export function zoomReset(win: BrowserWindow): number {
  return applyZoom(win, ZOOM_DEFAULT)
}

export function zoomPercent(factor: number): number {
  return Math.round(factor * 100)
}

export function attachZoomShortcuts(win: BrowserWindow, onChange: (factor: number) => void): void {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt || input.meta) return

    if (input.key === '=' || input.key === '+' || input.code === 'Equal') {
      event.preventDefault()
      onChange(zoomIn(win))
    } else if (input.key === '-' || input.code === 'Minus') {
      event.preventDefault()
      onChange(zoomOut(win))
    } else if (input.key === '0' || input.code === 'Digit0') {
      event.preventDefault()
      onChange(zoomReset(win))
    }
  })
}

if (typeof process !== 'undefined' && process.argv[1]?.replace(/\\/g, '/').includes('zoom')) {
  console.assert(clampZoom(0.5) === 0.75, 'min')
  console.assert(clampZoom(2) === 1.75, 'max')
  console.assert(zoomPercent(1.1) === 110, 'percent')
  console.log('zoom self-check ok')
}
