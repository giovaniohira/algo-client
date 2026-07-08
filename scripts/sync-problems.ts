/**
 * Puxa, categoriza e baixa problemas LeetCode localmente.
 *
 * Uso:
 *   npm run sync-problems
 *   npm run sync-problems -- --list-only
 *   npm run sync-problems -- --concurrency=20
 *
 * Auth opcional (problemas premium):
 *   set LEETCODE_SESSION=...
 *   set LEETCODE_CSRF=...
 */
import { Credential, LeetCode } from 'leetcode-query'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const

interface ProblemSummary {
  id: string
  slug: string
  title: string
  difficulty: string
  acRate: number | null
  isPaidOnly: boolean
  status: string | null
  tags: Array<{ name: string; slug: string }>
  file: string
}

interface Catalog {
  syncedAt: string
  total: number
  downloaded: number
  skippedPaid: number
  counts: Record<string, number>
  tags: string[]
  byDifficulty: Record<string, string[]>
  byTag: Record<string, string[]>
  problems: Record<string, ProblemSummary>
}

interface Options {
  outDir: string
  force: boolean
  listOnly: boolean
  concurrency: number
  listConcurrency: number
  limit: number | null
  pageSize: number
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    outDir: join(process.cwd(), 'data', 'problems'),
    force: false,
    listOnly: false,
    concurrency: 16,
    listConcurrency: 8,
    limit: null,
    pageSize: 100
  }
  for (const arg of argv) {
    if (arg === '--force') opts.force = true
    else if (arg === '--list-only') opts.listOnly = true
    else if (arg.startsWith('--out=')) opts.outDir = arg.slice('--out='.length)
    else if (arg.startsWith('--concurrency=')) opts.concurrency = Math.min(32, Math.max(1, Number(arg.slice(14)) || 16))
    else if (arg.startsWith('--list-concurrency=')) opts.listConcurrency = Math.min(16, Math.max(1, Number(arg.slice(19)) || 8))
    else if (arg.startsWith('--limit=')) opts.limit = Math.max(1, Number(arg.slice(8)) || 1)
    else if (arg.startsWith('--page-size=')) opts.pageSize = Math.min(100, Math.max(1, Number(arg.slice(12)) || 100))
    // ponytail: --delay= ignorado; use --concurrency para ajustar velocidade
    else if (arg.startsWith('--delay=')) {
      /* compat */
    }
  }
  return opts
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function tagDir(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

function problemFilename(id: string, slug: string): string {
  return `${id.padStart(4, '0')}-${slug}.json`
}

function makeClient(): LeetCode {
  const session = process.env.LEETCODE_SESSION
  const csrf = process.env.LEETCODE_CSRF ?? process.env.CSRFTOKEN
  if (session && csrf) {
    return new LeetCode(new Credential({ session, csrf }))
  }
  return new LeetCode()
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

function summaryFromQuestion(q: {
  questionFrontendId?: string
  frontendQuestionId?: string
  titleSlug: string
  title: string
  difficulty: string
  acRate?: number | null
  isPaidOnly?: boolean
  paidOnly?: boolean
  status?: string | null
  topicTags: Array<{ name: string; slug?: string }>
}): ProblemSummary {
  const id = String(q.questionFrontendId ?? q.frontendQuestionId)
  const slug = q.titleSlug
  return {
    id,
    slug,
    title: q.title,
    difficulty: q.difficulty,
    acRate: q.acRate ?? null,
    isPaidOnly: Boolean(q.isPaidOnly ?? q.paidOnly),
    status: q.status ?? null,
    tags: q.topicTags.map((t) => ({
      name: t.name,
      slug: t.slug || tagDir(t.name)
    })),
    file: join('all', problemFilename(id, slug))
  }
}

async function fetchAllSummaries(client: LeetCode, opts: Options): Promise<Catalog['problems']> {
  const first = await client.problems({ offset: 0, limit: opts.pageSize })
  const total = first.total
  const pageCount = Math.ceil(total / opts.pageSize)
  const offsets = Array.from({ length: pageCount }, (_, i) => i * opts.pageSize)

  let done = first.questions.length
  process.stdout.write(`\r  listagem: ${done}/${total}`)

  const pages =
    offsets.length <= 1
      ? [first]
      : [
          first,
          ...(await mapPool(offsets.slice(1), opts.listConcurrency, async (offset) => {
            const page = await client.problems({ offset, limit: opts.pageSize })
            done += page.questions.length
            process.stdout.write(`\r  listagem: ${Math.min(done, total)}/${total}`)
            return page
          }))
        ]

  const problems: Catalog['problems'] = {}
  for (const page of pages) {
    for (const q of page.questions) {
      const s = summaryFromQuestion(q)
      problems[s.slug] = s
    }
  }

  process.stdout.write('\n')
  return problems
}

function buildIndexes(problems: Catalog['problems']): Pick<Catalog, 'counts' | 'tags' | 'byDifficulty' | 'byTag'> {
  const byDifficulty: Record<string, string[]> = { Easy: [], Medium: [], Hard: [] }
  const byTag: Record<string, string[]> = {}
  const counts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 }
  const tagSet = new Set<string>()

  for (const p of Object.values(problems)) {
    const diff = p.difficulty in counts ? p.difficulty : 'Unknown'
    if (!byDifficulty[diff]) byDifficulty[diff] = []
    byDifficulty[diff].push(p.slug)
    counts[diff] = (counts[diff] ?? 0) + 1

    for (const tag of p.tags) {
      tagSet.add(tag.slug)
      if (!byTag[tag.slug]) byTag[tag.slug] = []
      byTag[tag.slug].push(p.slug)
    }
  }

  for (const slugs of Object.values(byDifficulty)) {
    slugs.sort((a, b) => problems[a].id.localeCompare(problems[b].id, undefined, { numeric: true }))
  }
  for (const slugs of Object.values(byTag)) {
    slugs.sort((a, b) => problems[a].id.localeCompare(problems[b].id, undefined, { numeric: true }))
  }

  return { counts, tags: [...tagSet].sort(), byDifficulty, byTag }
}

function writeCategoryIndexes(
  outDir: string,
  problems: Catalog['problems'],
  indexes: Pick<Catalog, 'byDifficulty' | 'byTag'>
): void {
  for (const diff of DIFFICULTIES) {
    const dir = join(outDir, 'by-difficulty', diff)
    mkdirSync(dir, { recursive: true })
    const items = (indexes.byDifficulty[diff] ?? []).map((slug) => problems[slug])
    writeFileSync(join(dir, 'index.json'), JSON.stringify(items, null, 2))
  }

  for (const [tagSlug, slugs] of Object.entries(indexes.byTag)) {
    const dir = join(outDir, 'by-tag', tagDir(tagSlug))
    mkdirSync(dir, { recursive: true })
    const items = slugs.map((slug) => problems[slug])
    writeFileSync(join(dir, 'index.json'), JSON.stringify(items, null, 2))
  }
}

async function fetchProblem(client: LeetCode, slug: string, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.problem(slug)
    } catch (err) {
      if (attempt === retries) throw err
      const msg = err instanceof Error ? err.message : String(err)
      const wait = /429|rate|too many/i.test(msg) ? 1500 * (attempt + 1) : 400 * (attempt + 1)
      await sleep(wait)
    }
  }
  throw new Error('unreachable')
}

async function downloadOne(
  client: LeetCode,
  summary: ProblemSummary,
  allDir: string,
  force: boolean
): Promise<'cached' | 'premium' | 'ok' | 'error'> {
  const dest = join(allDir, problemFilename(summary.id, summary.slug))

  if (!force && existsSync(dest)) return 'cached'

  if (summary.isPaidOnly) {
    writeFileSync(
      dest,
      JSON.stringify({ ...summary, paidOnly: true, content: null, error: 'premium — requer conta premium' }, null, 2)
    )
    return 'premium'
  }

  try {
    const q = await fetchProblem(client, summary.slug)
    let acRate = summary.acRate
    try {
      const stats = JSON.parse(q.stats) as { acRate?: string }
      if (stats.acRate) acRate = parseFloat(stats.acRate)
    } catch {
      /* ponytail: acRate opcional */
    }

    writeFileSync(
      dest,
      JSON.stringify(
        {
          ...summary,
          acRate,
          questionId: q.questionId,
          content: q.content,
          sampleTestCase: q.sampleTestCase ?? q.exampleTestcases ?? '',
          exampleTestcases: q.exampleTestcases ?? '',
          hints: q.hints ?? [],
          similarQuestions: q.similarQuestions ?? '',
          metaData: q.metaData ?? '',
          codeSnippets: q.codeSnippets ?? [],
          likes: q.likes,
          dislikes: q.dislikes,
          url: `https://leetcode.com/problems/${summary.slug}/`
        },
        null,
        2
      )
    )
    return 'ok'
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    writeFileSync(dest, JSON.stringify({ ...summary, error: msg }, null, 2))
    return 'error'
  }
}

async function downloadDetails(
  client: LeetCode,
  problems: Catalog['problems'],
  allDir: string,
  opts: Options
): Promise<{ downloaded: number; skippedPaid: number }> {
  mkdirSync(allDir, { recursive: true })
  const slugs = Object.keys(problems).sort((a, b) =>
    problems[a].id.localeCompare(problems[b].id, undefined, { numeric: true })
  )
  const target = opts.limit ? slugs.slice(0, opts.limit) : slugs
  const total = target.length
  let completed = 0
  let downloaded = 0
  let skippedPaid = 0
  const started = Date.now()

  const report = () => {
    const elapsed = (Date.now() - started) / 1000
    const rate = completed > 0 ? (completed / elapsed).toFixed(1) : '0'
    const eta = completed > 0 ? Math.round((total - completed) / (completed / elapsed)) : 0
    process.stdout.write(`\r  detalhes: ${completed}/${total} · ${rate}/s · ~${eta}s restantes`)
  }

  await mapPool(target, opts.concurrency, async (slug) => {
    const result = await downloadOne(client, problems[slug], allDir, opts.force)
    completed++
    if (result === 'cached' || result === 'ok') downloaded++
    if (result === 'premium') skippedPaid++
    report()
    return result
  })

  process.stdout.write('\n')
  return { downloaded, skippedPaid }
}

export async function syncProblems(opts: Options): Promise<Catalog> {
  mkdirSync(opts.outDir, { recursive: true })
  const client = makeClient()
  const auth = Boolean(process.env.LEETCODE_SESSION)

  console.log(`→ destino: ${opts.outDir}`)
  console.log(`→ auth: ${auth ? 'sim' : 'anônimo (use LEETCODE_SESSION + LEETCODE_CSRF para premium)'}`)
  console.log(`→ paralelismo: ${opts.concurrency} downloads · ${opts.listConcurrency} páginas`)

  console.log('→ listando problemas...')
  const problems = await fetchAllSummaries(client, opts)
  const indexes = buildIndexes(problems)

  let downloaded = 0
  let skippedPaid = 0

  if (!opts.listOnly) {
    console.log('→ baixando detalhes...')
    const result = await downloadDetails(client, problems, join(opts.outDir, 'all'), opts)
    downloaded = result.downloaded
    skippedPaid = result.skippedPaid
  }

  console.log('→ gravando índices por dificuldade e tag...')
  writeCategoryIndexes(opts.outDir, problems, indexes)

  const catalog: Catalog = {
    syncedAt: new Date().toISOString(),
    total: Object.keys(problems).length,
    downloaded,
    skippedPaid,
    ...indexes,
    problems
  }

  writeFileSync(join(opts.outDir, 'catalog.json'), JSON.stringify(catalog, null, 2))
  return catalog
}

// ponytail: self-check mínimo
if (process.argv[1]?.replace(/\\/g, '/').endsWith('sync-problems.ts')) {
  const assert = (c: boolean, m: string) => {
    if (!c) throw new Error(m)
  }
  assert(tagDir('Hash Table') === 'hash-table', 'tagDir')
  assert(problemFilename('1', 'two-sum') === '0001-two-sum.json', 'problemFilename')

  const opts = parseArgs(process.argv.slice(2))
  syncProblems(opts)
    .then((c) => {
      console.log(`\n✓ ${c.total} problemas catalogados`)
      if (!opts.listOnly) console.log(`  ${c.downloaded} arquivos em all/ (${c.skippedPaid} premium)`)
      console.log(`  ${c.tags.length} tags · Easy ${c.counts.Easy} · Medium ${c.counts.Medium} · Hard ${c.counts.Hard}`)
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
