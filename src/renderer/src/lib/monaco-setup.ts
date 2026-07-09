import type { Monaco } from '@monaco-editor/react'
import { defineAlgoNordTheme } from './monaco-theme'
import { registerEnhancedPython } from './monaco-python'

type MonacoModule = typeof import('monaco-editor')

let ready = false
let loadPromise: Promise<MonacoModule> | null = null

export async function ensureMonaco(): Promise<MonacoModule> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    await import('./monaco-workers')
    const monaco = await import('monaco-editor')
    const { loader } = await import('@monaco-editor/react')
    loader.config({ monaco })
    setupMonaco(monaco)
    return monaco
  })()
  return loadPromise
}

export function setupMonaco(m: MonacoModule | Monaco): void {
  if (ready) return
  defineAlgoNordTheme(m)
  registerEnhancedPython(m)
  m.editor.setTheme('algo-nord')
  ready = true
}

export function monacoLanguage(lang: string): string {
  if (lang === 'cpp') return 'cpp'
  if (lang === 'golang') return 'go'
  if (lang === 'python3') return 'python'
  return lang
}
