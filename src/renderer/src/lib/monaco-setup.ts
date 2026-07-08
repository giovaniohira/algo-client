import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { defineDsaNordTheme } from './monaco-theme'
import { registerEnhancedPython } from './monaco-python'

loader.config({ monaco })

let ready = false

export function setupMonaco(m: typeof monaco): void {
  if (ready) return
  defineDsaNordTheme(m)
  registerEnhancedPython(m)
  m.editor.setTheme('dsa-nord')
  ready = true
}

export function monacoLanguage(lang: string): string {
  if (lang === 'cpp') return 'cpp'
  if (lang === 'golang') return 'go'
  if (lang === 'python3') return 'python'
  return lang
}
