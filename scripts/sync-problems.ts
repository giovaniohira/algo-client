/**
 * Sync problem list metadata locally for fast browsing.
 *
 * Usage:
 *   npm run sync-problems
 *   npm run sync-problems -- --limit=100
 */
import { join } from 'path'
import { syncCatalogToPath } from '../src/main/platform/catalog-sync'

function parseArgs(argv: string[]) {
  const opts = {
    outDir: join(process.cwd(), 'data', 'problems'),
    listConcurrency: 8,
    limit: null as number | null,
    pageSize: 100
  }
  for (const arg of argv) {
    if (arg.startsWith('--out=')) opts.outDir = arg.slice('--out='.length)
    else if (arg.startsWith('--list-concurrency=')) {
      opts.listConcurrency = Math.min(16, Math.max(1, Number(arg.slice(19)) || 8))
    } else if (arg.startsWith('--limit=')) opts.limit = Math.max(1, Number(arg.slice(8)) || 1)
    else if (arg.startsWith('--page-size=')) opts.pageSize = Math.min(100, Math.max(1, Number(arg.slice(12)) || 100))
  }
  return opts
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('sync-problems.ts')) {
  const opts = parseArgs(process.argv.slice(2))
  const outPath = join(opts.outDir, 'catalog.json')

  console.log(`→ output: ${opts.outDir}`)
  console.log(`→ concurrency: ${opts.listConcurrency} pages`)

  syncCatalogToPath(
    outPath,
    { listConcurrency: opts.listConcurrency, pageSize: opts.pageSize, limit: opts.limit },
    ({ done, total }) => process.stdout.write(`\r  listing: ${done}/${total}`)
  )
    .then((c) => {
      process.stdout.write('\n')
      console.log(`\n✓ ${c.total} problems indexed`)
      console.log(`  ${c.tags.length} tags · Easy ${c.counts.Easy} · Medium ${c.counts.Medium} · Hard ${c.counts.Hard}`)
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
