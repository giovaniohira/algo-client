import { useEffect, useState, type ComponentType } from 'react'
import type { EditorProps } from '@monaco-editor/react'
import { ensureMonaco, monacoLanguage, setupMonaco } from '../lib/monaco-setup'
import { editorHighlightOptions } from '../lib/monaco-theme'

type EditorComponent = ComponentType<EditorProps>

interface Props {
  lang: string
  code: string
  onChange: (value: string) => void
}

export function CodeEditor({ lang, code, onChange }: Props) {
  const [Editor, setEditor] = useState<EditorComponent | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureMonaco()
      const { default: MonacoEditor } = await import('@monaco-editor/react')
      if (!cancelled) setEditor(() => MonacoEditor)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!Editor) {
    return (
      <div className="editor-wrap editor-loading">
        <span className="loading-dot">Loading editor</span>
      </div>
    )
  }

  return (
    <Editor
      height="100%"
      language={monacoLanguage(lang)}
      value={code}
      onChange={(v) => onChange(v ?? '')}
      theme="algo-nord"
      beforeMount={setupMonaco}
      options={editorHighlightOptions}
      loading={null}
    />
  )
}
