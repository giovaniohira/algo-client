const RECENT_KEY = 'algo-recent'
const MAX_RECENT = 12

export interface RecentEntry {
  slug: string
  title: string
  difficulty: string
  status: string
  lang: string
  at: number
}

export interface DraftTouch {
  slug: string
  lang: string
  at: number
}

const TOUCH_PREFIX = 'algo-draft-touch:'

export function touchDraft(slug: string, lang: string): void {
  try {
    localStorage.setItem(`${TOUCH_PREFIX}${slug}`, JSON.stringify({ lang, at: Date.now() }))
  } catch {
    /* ponytail: quota */
  }
}

export function latestDraftTouch(): DraftTouch | null {
  let best: DraftTouch | null = null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(TOUCH_PREFIX)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { lang: string; at: number }
      const slug = key.slice(TOUCH_PREFIX.length)
      if (!best || parsed.at > best.at) best = { slug, lang: parsed.lang, at: parsed.at }
    }
  } catch {
    return null
  }
  return best
}

export function recordSubmission(
  slug: string,
  title: string,
  difficulty: string,
  status: string,
  lang: string
): void {
  const entry: RecentEntry = { slug, title, difficulty, status, lang, at: Date.now() }
  try {
    const list = loadRecent()
    const next = [entry, ...list.filter((e) => e.slug !== slug || e.at !== entry.at)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    bumpActivityDay(new Date())
  } catch {
    /* ponytail: quota */
  }
}

export function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentEntry[]) : []
  } catch {
    return []
  }
}
const ACTIVITY_KEY = 'algo-activity'

function bumpActivityDay(d: Date): void {
  const key = d.toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    map[key] = (map[key] ?? 0) + 1
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(map))
  } catch {
    /* ponytail: quota */
  }
}

/** Last 52 weeks Ã— 7 days, row-major (week columns). */
export function activityHeatmap(): number[][] {
  const map: Record<string, number> = {}
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (raw) Object.assign(map, JSON.parse(raw) as Record<string, number>)
  } catch {
    /* ignore */
  }

  const weeks: number[][] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 52 * 7 + 1)

  for (let w = 0; w < 52; w++) {
    const col: number[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      if (day > today) {
        col.push(0)
        continue
      }
      col.push(map[day.toISOString().slice(0, 10)] ?? 0)
    }
    weeks.push(col)
  }
  return weeks
}

const FIRST_LOGIN_KEY = 'algo-first-login'
export function ensureFirstLogin(): string {
  try {
    const existing = localStorage.getItem(FIRST_LOGIN_KEY)
    if (existing) return existing
    const now = new Date().toISOString()
    localStorage.setItem(FIRST_LOGIN_KEY, now)
    return now
  } catch {
    return new Date().toISOString()
  }
}

export function formatRelativePt(ms: number): string {
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatRelative(ms: number): string {
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(ms).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
}
