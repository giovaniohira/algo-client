import { LeetCode } from 'leetcode-query'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const STALE_MS = 24 * 60 * 60 * 1000

export { STALE_MS }

export interface ProblemSummary {
  id: string
  slug: string
  title: string
  difficulty: string
  acRate: number | null
  isPaidOnly: boolean
  status: string | null
  tags: Array<{ name: string; slug: string }>
}

export interface Catalog {
  syncedAt: string
  total: number
  counts: Record<string, number>
  tags: string[]
  byDifficulty: Record<string, string[]>
  byTag: Record<string, string[]>
  problems: Record<string, ProblemSummary>
}

export interface CatalogStatus {
  exists: boolean
  syncedAt: string | null
  total: number
  stale: boolean
}

export interface SyncProgress {
  phase: 'listing'
  done: number
  total: number
}

export interface SyncOptions {
  listConcurrency?: number
  pageSize?: number
  limit?: number | null
  outPath?: string
}

let syncing = false

export function catalogDir(): string {
  return join(app.getPath('userData'), 'catalog')
}

export function catalogPath(): string {
  return join(catalogDir(), 'catalog.json')
}

function tagDir(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
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
  return {
    id,
    slug: q.titleSlug,
    title: q.title,
    difficulty: q.difficulty,
    acRate: q.acRate ?? null,
    isPaidOnly: Boolean(q.isPaidOnly ?? q.paidOnly),
    status: q.status ?? null,
    tags: q.topicTags.map((t) => ({
      name: t.name,
      slug: t.slug || tagDir(t.name)
    }))
  }
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

async function fetchAllSummaries(
  client: LeetCode,
  opts: Required<Pick<SyncOptions, 'listConcurrency' | 'pageSize'>>,
  onProgress?: (p: SyncProgress) => void
): Promise<Catalog['problems']> {
  const first = await client.problems({ offset: 0, limit: opts.pageSize })
  const total = first.total
  const pageCount = Math.ceil(total / opts.pageSize)
  const offsets = Array.from({ length: pageCount }, (_, i) => i * opts.pageSize)

  let done = first.questions.length
  onProgress?.({ phase: 'listing', done, total })

  const pages =
    offsets.length <= 1
      ? [first]
      : [
          first,
          ...(await mapPool(offsets.slice(1), opts.listConcurrency, async (offset) => {
            const page = await client.problems({ offset, limit: opts.pageSize })
            done += page.questions.length
            onProgress?.({ phase: 'listing', done: Math.min(done, total), total })
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

  return problems
}

export function readCatalogFile(path: string): Catalog | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Catalog
  } catch {
    return null
  }
}

export function getCatalogStatus(): CatalogStatus {
  const path = catalogPath()
  const catalog = readCatalogFile(path)
  if (!catalog) {
    return { exists: false, syncedAt: null, total: 0, stale: true }
  }
  const syncedAt = catalog.syncedAt ?? null
  const stale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > STALE_MS
  return {
    exists: true,
    syncedAt,
    total: catalog.total || Object.keys(catalog.problems).length,
    stale
  }
}

export function isCatalogSyncing(): boolean {
  return syncing
}

export async function syncCatalogToPath(
  destPath: string,
  opts: SyncOptions = {},
  onProgress?: (p: SyncProgress) => void
): Promise<Catalog> {
  if (syncing) throw new Error('Catalog sync already in progress')
  syncing = true

  const options = {
    listConcurrency: Math.min(16, Math.max(1, opts.listConcurrency ?? 8)),
    pageSize: Math.min(100, Math.max(1, opts.pageSize ?? 100)),
    limit: opts.limit ?? null
  }

  try {
    const client = new LeetCode()

    let problems = await fetchAllSummaries(client, options, onProgress)
    if (options.limit) {
      const slugs = Object.keys(problems)
        .sort((a, b) => problems[a].id.localeCompare(problems[b].id, undefined, { numeric: true }))
        .slice(0, options.limit)
      problems = Object.fromEntries(slugs.map((slug) => [slug, problems[slug]]))
    }

    const catalog: Catalog = {
      syncedAt: new Date().toISOString(),
      total: Object.keys(problems).length,
      ...buildIndexes(problems),
      problems
    }

    mkdirSync(join(destPath, '..'), { recursive: true })
    writeFileSync(destPath, JSON.stringify(catalog, null, 2))
    return catalog
  } finally {
    syncing = false
  }
}

export async function syncCatalog(
  opts: SyncOptions = {},
  onProgress?: (p: SyncProgress) => void
): Promise<Catalog> {
  const dest = opts.outPath ?? catalogPath()
  return syncCatalogToPath(dest, opts, onProgress)
}

/** ponytail: missing catalog blocks; stale catalog refreshes in background */
export async function maybeSyncCatalog(
  shouldSync: () => { missing: boolean; stale: boolean },
  onProgress?: (p: SyncProgress) => void
): Promise<Catalog | null> {
  const { missing, stale } = shouldSync()
  if (missing) return syncCatalog({}, onProgress)
  if (stale) return syncCatalog({}, onProgress).catch(() => null)
  return null
}
