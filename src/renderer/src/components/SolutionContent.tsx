import { useEffect, useRef } from 'react'
import { ensureMonaco, monacoLanguage } from '../lib/monaco-setup'

function langToMonaco(lang: string): string {
  const slug = lang.toLowerCase().replace(/\s+\[\].*$/, '')
  if (slug === 'c++') return monacoLanguage('cpp')
  if (slug === 'python' || slug === 'python3') return monacoLanguage('python3')
  if (slug === 'golang') return monacoLanguage('golang')
  return monacoLanguage(slug)
}

function wireCodeTabs(root: HTMLElement): () => void {
  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.solution-code-tab')
    if (!btn || !root.contains(btn)) return
    const tabs = btn.closest('.solution-code-tabs')
    if (!tabs) return
    const idx = btn.dataset.tab
    tabs.querySelectorAll('.solution-code-tab').forEach((b) => b.classList.toggle('active', b === btn))
    tabs.querySelectorAll('.solution-code-panel').forEach((p) =>
      p.classList.toggle('active', (p as HTMLElement).dataset.tab === idx)
    )
  }
  root.addEventListener('click', onClick)
  return () => root.removeEventListener('click', onClick)
}

async function highlightCodeBlocks(root: HTMLElement): Promise<void> {
  const monaco = await ensureMonaco()
  const blocks = root.querySelectorAll<HTMLElement>('.solution-code-panel, .solution-code-single')
  await Promise.all(
    Array.from(blocks).map(async (panel) => {
      const code = panel.querySelector('code')
      if (!code || code.dataset.highlighted === '1') return
      const text = code.textContent ?? ''
      const lang = langToMonaco(panel.dataset.lang ?? 'text')
      code.innerHTML = await monaco.editor.colorize(text, lang, {})
      code.dataset.highlighted = '1'
    })
  )
}

interface Props {
  html: string
}

export function SolutionContent({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const unwire = wireCodeTabs(root)
    void highlightCodeBlocks(root)
    return unwire
  }, [html])

  return (
    <div
      ref={ref}
      className="problem-content solution-summary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
