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
