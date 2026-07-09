import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { catalogPath as userCatalogPath, readCatalogFile, type Catalog } from './catalog-sync'

interface LocalProblem {
  id: string
  slug: string
  title: string
  difficulty: string
  acRate: number | null
  status: string | null
  tags: Array<{ name: string; slug: string }>
}

interface LocalCatalogFile {
  total: number
  tags?: string[]
  problems: Record<string, LocalProblem>
}

export type LocalSummary = {
  id: string
  slug: string
  title: string
  difficulty: string
  status: string | null
  acRate: number | null
  tags: Array<{ name: string; slug: string }>
}

let catalogCache: LocalCatalogFile | null | undefined
let summariesCache: LocalSummary[] | null = null
let tagOptionsCache: Array<{ name: string; slug: string }> | null = null

function bundledCatalogPath(): string {
  const root = app.isPackaged ? process.resourcesPath : process.cwd()
  return join(root, 'data', 'problems', 'catalog.json')
}

function resolveCatalogPath(): string | null {
  const userPath = userCatalogPath()
  if (existsSync(userPath)) return userPath
  const bundled = bundledCatalogPath()
  if (existsSync(bundled)) return bundled
  return null
}

export function invalidateCatalogCache(): void {
  catalogCache = undefined
  summariesCache = null
  tagOptionsCache = null
}

export function getCatalogSyncedAt(): string | null {
  const path = resolveCatalogPath()
  if (!path) return null
  const catalog = readCatalogFile(path) as Catalog | null
  return catalog?.syncedAt ?? null
}

export function loadSortedSlugs(): string[] {
  const catalog = getCatalog()
  if (!catalog) return []
  return Object.values(catalog.problems)
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((p) => p.slug)
}

function getCatalog(): LocalCatalogFile | null {
  if (catalogCache !== undefined) return catalogCache
  const path = resolveCatalogPath()
  if (!path) {
    catalogCache = null
    return null
  }
  try {
    catalogCache = JSON.parse(readFileSync(path, 'utf-8')) as LocalCatalogFile
  } catch {
    catalogCache = null
  }
  return catalogCache
}

function buildSummaries(catalog: LocalCatalogFile): LocalSummary[] {
  return Object.values(catalog.problems)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      status: p.status ?? null,
      acRate: p.acRate ?? null,
      tags: p.tags ?? []
    }))
    .sort((a, b) => Number(a.id) - Number(b.id))
}

export function warmLocalCatalog(): void {
  loadLocalSummaries()
  loadLocalTagOptions()
}

export function getLocalTotal(): number {
  const catalog = getCatalog()
  if (!catalog) return 0
  return catalog.total || Object.keys(catalog.problems).length
}

export function loadLocalSummaries(limit?: number): LocalSummary[] {
  if (!summariesCache) {
    const catalog = getCatalog()
    summariesCache = catalog ? buildSummaries(catalog) : []
  }
  if (limit == null || limit >= summariesCache.length) return summariesCache
  return summariesCache.slice(0, limit)
}

export function loadLocalTagOptions(): Array<{ name: string; slug: string }> {
  if (tagOptionsCache) return tagOptionsCache

  const catalog = getCatalog()
  if (!catalog) {
    tagOptionsCache = []
    return tagOptionsCache
  }

  if (catalog.tags?.length) {
    tagOptionsCache = catalog.tags
      .map((slug) => ({
        slug,
        name: slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return tagOptionsCache
  }

  const seen = new Map<string, { name: string; slug: string }>()
  for (const p of Object.values(catalog.problems)) {
    for (const tag of p.tags ?? []) {
      if (!seen.has(tag.slug)) seen.set(tag.slug, tag)
    }
  }
  tagOptionsCache = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  return tagOptionsCache
}
