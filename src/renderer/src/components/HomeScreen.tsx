import { useEffect, useMemo, useState } from 'react'
import type { CatalogStatus, Profile, ProblemSummary } from '../../../../preload/index.d'
import { api } from '../lib/api'
import {
  formatRelative,
  latestDraftTouch,
  loadRecent,
  type RecentEntry
} from '../lib/recent'
import { submissionCalendarHeatmap } from '../lib/submission-calendar'

interface Props {
  profile: Profile
  onOpenProblem: (slug: string) => void
  onOpenProfile: () => void
  onBrowse: () => void
  onRandom: () => void
}

const LANG_LABELS: Record<string, string> = {
  python3: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  golang: 'Go',
  rust: 'Rust'
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function difficultyClass(d: string): string {
  const n = d.toLowerCase()
  if (n === 'easy') return 'diff-easy'
  if (n === 'hard') return 'diff-hard'
  return 'diff-medium'
}

function difficultyDotTone(d: string): string {
  const n = d.toLowerCase()
  if (n === 'easy') return 'tone-easy'
  if (n === 'hard') return 'tone-hard'
  return 'tone-medium'
}

function formatPct(value: number, max: number): string {
  if (max <= 0) return '0%'
  const pct = (value / max) * 100
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="dash-ring" aria-label={`${formatPct(value, max)} completed`}>
      <svg width="108" height="108" viewBox="0 0 108 108">
        <defs>
          <linearGradient id="dash-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb340" />
            <stop offset="100%" stopColor="#ff9d00" />
          </linearGradient>
        </defs>
        <circle cx="54" cy="54" r={r} className="dash-ring-track" />
        <circle
          cx="54"
          cy="54"
          r={r}
          className="dash-ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="dash-ring-label">
        <span className="dash-ring-caption">Progress</span>
        <strong>{formatPct(value, max)}</strong>
        <span>
          {value.toLocaleString('en-US')} / {max.toLocaleString('en-US')}
        </span>
      </div>
    </div>
  )
}

function DiffBar({ label, count, max, tone }: { label: string; count: number; max: number; tone: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="dash-diff-row">
      <span className={`dash-diff-dot ${tone}`} />
      <span className="dash-diff-name">{label}</span>
      <div className="dash-diff-track">
        <div className={`dash-diff-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="dash-diff-count">{count}</span>
    </div>
  )
}

function Heatmap({ calendar }: { calendar: string }) {
  const weeks = useMemo(() => submissionCalendarHeatmap(calendar), [calendar])
  const max = useMemo(() => Math.max(1, ...weeks.flat()), [weeks])
  return (
    <div className="dash-heatmap" aria-label="Solves in the last 12 months">
      <div className="dash-heatmap-grid">
        {weeks.map((col, wi) => (
          <div key={wi} className="dash-heatmap-col">
            {col.map((n, di) => (
              <span
                key={di}
                className="dash-heatmap-cell"
                data-level={n === 0 ? 0 : n / max < 0.34 ? 1 : n / max < 0.67 ? 2 : 3}
                title={n > 0 ? `${n} activit${n === 1 ? 'y' : 'ies'}` : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeScreen({ profile, onOpenProblem, onOpenProfile, onBrowse, onRandom }: Props) {
  const [catalog, setCatalog] = useState<CatalogStatus | null>(null)
  const [summaries, setSummaries] = useState<Map<string, ProblemSummary>>(new Map())
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [search, setSearch] = useState('')
  const [continueSlug, setContinueSlug] = useState<string | null>(null)
  const [continueLang, setContinueLang] = useState('python3')
  const [continueAt, setContinueAt] = useState(0)

  const initials = profile.username.slice(0, 2).toUpperCase()

  useEffect(() => {
    setRecent(loadRecent())
    const touch = latestDraftTouch()
    if (touch) {
      setContinueSlug(touch.slug)
      setContinueLang(touch.lang)
      setContinueAt(touch.at)
    }
  }, [])

  useEffect(() => {
    void api()
      .catalogStatus()
      .then(setCatalog)
      .catch(() => {})
    void api()
      .listProblems({ limit: 5000 })
      .then((res) => {
        const map = new Map<string, ProblemSummary>()
        for (const q of res.questions) map.set(q.slug, q)
        setSummaries(map)
      })
      .catch(() => {})
  }, [])

  const total = catalog?.total ?? summaries.size
  const continueProblem = continueSlug ? summaries.get(continueSlug) : undefined
  const filtered = search.trim()
    ? [...summaries.values()]
        .filter((q) => q.title.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 6)
    : []

  const diffMax = Math.max(profile.solvedEasy, profile.solvedMedium, profile.solvedHard, 1)

  const syncLabel = catalog?.syncedAt
    ? `Synced ${formatRelative(new Date(catalog.syncedAt).getTime())} ago`
    : null

  return (
    <div className="dash-page">
      <header className="dash-hero">
        <div className="dash-hero-left">
          <h1>
            {greeting()}, {profile.username} <span aria-hidden="true">👋</span>
          </h1>
          <p>Ready to solve another one?</p>
        </div>
        <div className="dash-hero-right">
          <ProgressRing value={profile.solved} max={total || profile.solved} />
          <button
            type="button"
            className="dash-hero-avatar-btn"
            onClick={onOpenProfile}
            title="View profile"
            aria-label="View profile"
          >
            {profile.avatarUrl ? (
              <img className="dash-hero-avatar" src={profile.avatarUrl} alt="" />
            ) : (
              <span className="dash-hero-avatar dash-hero-avatar-fallback">{initials}</span>
            )}
          </button>
        </div>
      </header>

      <div className="dash-search-block">
        <div className="dash-search-wrap">
          <svg className="dash-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            className="dash-search"
            type="search"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered[0]) onOpenProblem(filtered[0].slug)
            }}
          />
          {filtered.length > 0 && (
            <ul className="dash-search-results">
              {filtered.map((q) => (
                <li key={q.slug}>
                  <button type="button" onClick={() => onOpenProblem(q.slug)}>
                    {q.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {continueProblem && (
        <section className="dash-continue">
          <span className="dash-section-label">Continue solving</span>
          <div className="dash-continue-row">
            <div className="dash-continue-main">
              <div className="dash-continue-title-row">
                <span className="dash-continue-title">{continueProblem.title}</span>
                <span className={`dash-pill ${difficultyClass(continueProblem.difficulty)}`}>
                  {continueProblem.difficulty}
                </span>
              </div>
              <div className="dash-continue-meta-row">
                <span className="dash-continue-meta">
                  {LANG_LABELS[continueLang] ?? continueLang}
                  {continueAt ? ` · ${formatRelative(continueAt)} ago` : ''}
                </span>
                {continueProblem.acRate != null && (
                  <span className="dash-continue-meta">{continueProblem.acRate.toFixed(1)}% acceptance</span>
                )}
              </div>
              {continueProblem.tags.length > 0 && (
                <div className="dash-continue-tags">
                  {continueProblem.tags.slice(0, 4).map((t) => (
                    <span key={t.slug} className="dash-continue-tag">
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="dash-link-btn dash-continue-btn"
              onClick={() => onOpenProblem(continueProblem.slug)}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      <div className="dash-main">
        <div className="dash-grid dash-grid-2">
          <section className="dash-panel">
            <span className="dash-section-label">Recent</span>
            {recent.length === 0 ? (
              <div className="dash-recent-empty">
                <span className="dash-recent-empty-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <p className="dash-recent-empty-title">No recent submissions.</p>
                <p className="dash-recent-empty-desc">Start solving problems to build your history.</p>
              </div>
            ) : (
              <>
                <ul className="dash-list">
                  {recent.slice(0, 5).map((e) => (
                    <li key={`${e.slug}-${e.at}`}>
                      <button type="button" className="dash-list-btn" onClick={() => onOpenProblem(e.slug)}>
                        <span className={`dash-diff-dot ${difficultyDotTone(e.difficulty)}`} />
                        <span className="dash-list-title">{e.title}</span>
                        <span className={`dash-pill dash-pill-sm ${difficultyClass(e.difficulty)}`}>
                          {e.difficulty}
                        </span>
                        <span className="dash-list-time">{formatRelative(e.at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="dash-panel-link" onClick={onBrowse}>
                  View history →
                </button>
              </>
            )}
          </section>

          <section className="dash-panel dash-panel-performance">
            <span className="dash-section-label">Performance</span>
            <div className="dash-diff-bars">
              <DiffBar label="Easy" count={profile.solvedEasy} max={diffMax} tone="tone-easy" />
              <DiffBar label="Medium" count={profile.solvedMedium} max={diffMax} tone="tone-medium" />
              <DiffBar label="Hard" count={profile.solvedHard} max={diffMax} tone="tone-hard" />
            </div>
            <p className="dash-heatmap-label">Solves in the last 12 months</p>
            <Heatmap calendar={profile.submissionCalendar} />
          </section>
        </div>

        <div className="dash-actions-row">
          <button type="button" className="dash-action-card" onClick={onBrowse}>
            <span className="dash-action-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="dash-action-text">
              <strong>Browse Catalog</strong>
              <span>See all problems</span>
            </span>
            <span className="dash-action-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="dash-action-card" onClick={onRandom}>
            <span className="dash-action-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </span>
            <span className="dash-action-text">
              <strong>Random Problem</strong>
              <span>Solve a random challenge</span>
            </span>
            <span className="dash-action-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {syncLabel && <p className="dash-footnote dash-footnote-center">{syncLabel}</p>}
    </div>
  )
}
