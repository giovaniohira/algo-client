import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assets = join('out', 'renderer', 'assets')
const files = readdirSync(assets)
const js = files.filter((f) => f.endsWith('.js'))

const workers = js.filter((f) => /editor\.worker|ts\.worker/.test(f))
const langs = js.filter((f) => /^(python|javascript|typescript|java|cpp|go|rust)-/.test(f))
const removed = js.filter((f) =>
  /css\.worker|html\.worker|json\.worker|abap|solidity|freemarker/.test(f)
)
const entryChunks = js.filter((f) => /^index-/.test(f))
const monacoEntry = js.find((f) => f.startsWith('monaco-entry-'))
const mainEntry = entryChunks
  .map((f) => ({ f, size: statSync(join(assets, f)).size }))
  .sort((a, b) => a.size - b.size)[0]

const checks = [
  workers.length === 2,
  workers.some((f) => f.startsWith('editor.worker')),
  workers.some((f) => f.startsWith('ts.worker')),
  langs.length === 7,
  removed.length === 0,
  Boolean(monacoEntry),
  mainEntry != null && mainEntry.size < 512 * 1024
]

if (!checks.every(Boolean)) {
  console.error('monaco bundle check failed', {
    workers,
    langs: langs.map((f) => f.split('-')[0]),
    removed,
    monacoEntry,
    mainEntryKb: mainEntry ? Math.round(mainEntry.size / 1024) : null
  })
  process.exit(1)
}

const monacoMb = monacoEntry
  ? (statSync(join(assets, monacoEntry)).size / 1024 / 1024).toFixed(1)
  : '?'

console.log('monaco bundle ok:', {
  mainEntryKb: Math.round(mainEntry!.size / 1024),
  monacoEntryMb: monacoMb,
  workers,
  langs: langs.map((f) => f.split('-')[0])
})
