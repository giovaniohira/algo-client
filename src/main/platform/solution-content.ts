function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** LeetCode returns markdown with JSON-style escape sequences left literal. */
export function unescapeLeetCodeContent(raw: string): string {
  if (!raw.includes('\\')) return raw

  const BS = '\u0000B'
  let text = raw.replace(/\\\\/g, BS)

  text = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return text.replace(new RegExp(BS, 'g'), '\\')
}

function isHtmlContent(text: string): boolean {
  const t = text.trimStart()
  return t.startsWith('<') && /<\/[a-z][\s\S]*>/i.test(t)
}

function renderMath(expr: string): string {
  let e = escapeHtml(expr.trim())
  e = e.replace(/\\log\b/g, 'log')
  e = e.replace(/\\cdot/g, '·')
  e = e.replace(/\\times/g, '×')
  e = e.replace(/\^(\{([^}]+)\}|(\w+))/g, (_, _g, braced, plain) => `<sup>${braced ?? plain}</sup>`)
  return `<span class="lc-math">${e}</span>`
}

function renderImage(alt: string, url: string, block: boolean): string {
  const img = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" class="solution-img" />`
  return block ? `<figure class="solution-figure">${img}</figure>` : img
}

function inlineMarkdown(s: string): string {
  const stash: string[] = []
  const stashPush = (html: string): string => {
    const i = stash.length
    stash.push(html)
    return `\u0000S${i}\u0000`
  }

  let t = s
  t = t.replace(/\$\$([^$]+)\$\$/g, (_, m) => stashPush(renderMath(m)))
  t = t.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_, m) => stashPush(renderMath(m)))
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
    stashPush(renderImage(alt, url, false))
  )

  t = escapeHtml(t)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  t = t.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  )

  return t.replace(/\u0000S(\d+)\u0000/g, (_, i) => stash[Number(i)])
}

interface CodeBlock {
  lang: string
  code: string
}

function codeTabLabel(lang: string): string {
  const key = lang.toLowerCase().replace(/\s+\[\].*$/, '')
  const labels: Record<string, string> = {
    python: 'Python',
    python3: 'Python',
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
    'c++': 'C++',
    golang: 'Go',
    typescript: 'TypeScript',
    rust: 'Rust',
    csharp: 'C#',
    'c#': 'C#'
  }
  return labels[key] ?? key
}

function normalizeLang(lang: string): string {
  const key = lang.toLowerCase().replace(/\s+\[\].*$/, '')
  if (key === 'c++') return 'cpp'
  if (key === 'python3') return 'python'
  if (key === 'golang') return 'go'
  return key
}

function renderCodeBlock(block: CodeBlock, tabIndex?: number): string {
  const lang = normalizeLang(block.lang)
  const tabAttr = tabIndex != null ? ` data-tab="${tabIndex}"` : ''
  const active = tabIndex == null || tabIndex === 0 ? ' active' : ''
  return `<pre class="solution-code-panel${active}"${tabAttr} data-lang="${escapeHtml(lang)}"><code>${escapeHtml(block.code)}</code></pre>`
}

function renderCodeTabs(blocks: CodeBlock[]): string {
  const tabs = blocks
    .map(
      (b, i) =>
        `<button type="button" class="solution-code-tab${i === 0 ? ' active' : ''}" data-tab="${i}">${escapeHtml(codeTabLabel(b.lang))}</button>`
    )
    .join('')
  const panels = blocks.map((b, i) => renderCodeBlock(b, i)).join('')
  return `<div class="solution-code-tabs"><div class="solution-code-tabbar">${tabs}</div><div class="solution-code-panels">${panels}</div></div>`
}

function renderCodeBlocks(blocks: CodeBlock[]): string {
  if (blocks.length === 0) return ''
  if (blocks.length === 1) {
    return `<div class="solution-code-single">${renderCodeBlock(blocks[0])}</div>`
  }
  return renderCodeTabs(blocks)
}

function markdownToHtml(md: string): string {
  const blocks: CodeBlock[] = []
  const FENCE = '\u0000F'

  const src = md.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_, info, code) => {
    const idx = blocks.length
    blocks.push({ lang: info.trim(), code: code.replace(/\n$/, '') })
    return `${FENCE}${idx}${FENCE}`
  })

  const lines = src.split('\n')
  const out: string[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (!listItems.length) return
    out.push(`<ul>${listItems.join('')}</ul>`)
    listItems = []
  }

  const fenceLine = new RegExp(`${FENCE}(\\d+)${FENCE}`, 'g')
  let pendingBlocks: CodeBlock[] = []

  const flushCodeBlocks = () => {
    if (!pendingBlocks.length) return
    out.push(renderCodeBlocks(pendingBlocks))
    pendingBlocks = []
  }

  const takeFenceIndices = (line: string): string => {
    return line.replace(fenceLine, (_, i) => {
      pendingBlocks.push(blocks[Number(i)])
      return ''
    })
  }

  for (const line of lines) {
    if (line.includes(FENCE)) {
      flushList()
      const rest = takeFenceIndices(line).trim()
      if (rest) {
        flushCodeBlocks()
        out.push(`<p>${inlineMarkdown(rest)}</p>`)
      }
      continue
    }

    flushCodeBlocks()

    const trimmed = line.trim()
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList()
      out.push('<hr class="solution-hr" />')
      continue
    }

    const blockImg = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (blockImg) {
      flushList()
      out.push(renderImage(blockImg[1], blockImg[2], true))
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList()
      const m = line.match(/^(#{1,6})\s+(.*)$/)!
      const level = m[1].length
      out.push(`<h${level}>${inlineMarkdown(m[2])}</h${level}>`)
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      listItems.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      listItems.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`)
      continue
    }
    if (trimmed === '') {
      flushList()
      continue
    }
    flushList()
    out.push(`<p>${inlineMarkdown(line)}</p>`)
  }
  flushList()
  flushCodeBlocks()

  return out.join('\n')
}

export function formatSolutionContent(raw: string): string {
  if (!raw) return ''
  const text = unescapeLeetCodeContent(raw)
  if (isHtmlContent(text)) return text
  return markdownToHtml(text)
}
