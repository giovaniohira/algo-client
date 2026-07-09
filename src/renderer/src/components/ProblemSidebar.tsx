import { useEffect, useMemo, useState } from 'react'
import type {
  ProblemDetail,
  SolutionArticle,
  SubmissionDetail,
  SubmissionSummary
} from '../../../../preload/index.d'
import { api } from '../lib/api'
import { SolutionContent } from './SolutionContent'

type Tab = 'description' | 'solutions' | 'submissions'

interface Props {
  problem: ProblemDetail
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)

  if (day >= 7) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  if (day === 1) return 'a day ago'
  if (day > 1) return `${day} days ago`
  if (hr === 1) return 'an hour ago'
  if (hr > 1) return `${hr} hours ago`
  if (min < 1) return 'just now'
  if (min === 1) return 'a minute ago'
  return `${min} minutes ago`
}

function statusClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('accept')) return 'accepted'
  if (s.includes('wrong')) return 'wrong'
  if (s.includes('runtime error') || s.includes('compile error')) return 'error'
  if (s.includes('time limit')) return 'tle'
  return 'other'
}

function isAccepted(status: string): boolean {
  return status.toLowerCase().includes('accept')
}

function metricOrNa(value: string, accepted: boolean): string {
  if (!accepted || !value.trim()) return 'N/A'
  return value
}

function formatCompactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1000
    if (k >= 100) return `${Math.round(k)}k`
    if (k >= 10) return `${Math.round(k)}k`
    return `${k.toFixed(1).replace(/\.0$/, '')}k`
  }
  const m = n / 1_000_000
  if (m >= 100) return `${Math.round(m)}M`
  if (m >= 10) return `${Math.round(m)}M`
  return `${m.toFixed(1).replace(/\.0$/, '')}M`
}

function SolutionStats({ votes, views }: { votes: number; views: number }) {
  return (
    <div className="solution-stats">
      {votes > 0 && (
        <span className="solution-stat" title="Votes">
          <span className="solution-stat-icon" aria-hidden="true">
            ▲
          </span>
          {formatCompactCount(votes)}
        </span>
      )}
      {views > 0 && (
        <span className="solution-stat" title="Views">
          <span className="solution-stat-icon" aria-hidden="true">
            ◉
          </span>
          {formatCompactCount(views)}
        </span>
      )}
    </div>
  )
}

export function ProblemSidebar({ problem }: Props) {
  const [tab, setTab] = useState<Tab>('description')
  const [hintLevel, setHintLevel] = useState(0)
  const [solutions, setSolutions] = useState<SolutionArticle[] | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionSummary[] | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<SolutionArticle | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionSummary | null>(null)
  const [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displaySubmissions = useMemo(
    () => (submissions ? [...submissions].reverse() : null),
    [submissions]
  )

  useEffect(() => {
    setTab('description')
    setHintLevel(0)
    setSolutions(null)
    setSubmissions(null)
    setSelectedSolution(null)
    setSelectedSubmission(null)
    setSubmissionDetail(null)
    setError(null)
  }, [problem.slug])

  useEffect(() => {
    if (tab === 'solutions' && solutions === null) {
      setLoading(true)
      setError(null)
      void api()
        .listSolutions(problem.slug)
        .then(setSolutions)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load solutions'))
        .finally(() => setLoading(false))
    }
    if (tab === 'submissions' && submissions === null) {
      setLoading(true)
      setError(null)
      void api()
        .listSubmissions(problem.slug, 50)
        .then(setSubmissions)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load submissions'))
        .finally(() => setLoading(false))
    }
  }, [tab, problem.slug, solutions, submissions])

  useEffect(() => {
    if (!selectedSolution) return
    document.querySelector('.sidebar')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedSolution])

  const openSubmission = (sub: SubmissionSummary) => {
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(null)
      setSubmissionDetail(null)
      return
    }
    setSelectedSubmission(sub)
    setSubmissionDetail(null)
    setLoading(true)
    void api()
      .loadSubmissionDetail(sub.id)
      .then(setSubmissionDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load code'))
      .finally(() => setLoading(false))
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: 'Description' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'submissions', label: 'Submissions' }
  ]

  return (
    <div key={problem.slug} className="problem-view">
      <div className="problem-header">
        <h1>
          {problem.questionFrontendId}. {problem.title}
        </h1>
        <span className={`diff-badge ${problem.difficulty.toLowerCase()}`}>
          <span className="diff-dot" />
          {problem.difficulty}
        </span>
      </div>

      <div className="tags">
        {problem.topicTags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      <div className="problem-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`problem-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="sidebar-error">{error}</p>}

      {tab === 'description' && (
        <div className="problem-tab-panel">
          <div className="problem-content" dangerouslySetInnerHTML={{ __html: problem.content }} />
          {problem.hints.length > 0 && (
            <div className="hints-panel">
              <div className="hints-header">
                <span className="hints-title">Hints</span>
                {hintLevel < problem.hints.length && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setHintLevel((n) => n + 1)}
                  >
                    Show hint {hintLevel + 1}
                  </button>
                )}
              </div>
              {hintLevel === 0 ? (
                <p className="hints-placeholder muted">
                  {problem.hints.length} hint{problem.hints.length > 1 ? 's' : ''} available
                </p>
              ) : (
                <ol className="hints-list">
                  {problem.hints.slice(0, hintLevel).map((hint, i) => (
                    <li key={i} className="hint-item" dangerouslySetInnerHTML={{ __html: hint }} />
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'solutions' && (
        <div className="problem-tab-panel solution-tab-panel">
          {loading && !solutions && <p className="muted">Loading solutions…</p>}
          {solutions?.length === 0 && <p className="muted">No published solutions yet.</p>}

          {selectedSolution ? (
            <div className="solution-detail">
              <button
                type="button"
                className="solution-back"
                onClick={() => setSelectedSolution(null)}
              >
                <span className="solution-back-icon" aria-hidden="true">
                  ←
                </span>
                All Solutions
              </button>

              <h2 className="solution-detail-title">{selectedSolution.title}</h2>

              <div className="solution-detail-meta">
                {selectedSolution.author && (
                  <span className="solution-author">@{selectedSolution.author}</span>
                )}
                <SolutionStats
                  votes={selectedSolution.voteCount}
                  views={selectedSolution.viewCount}
                />
              </div>

              {selectedSolution.tags.length > 0 && (
                <div className="solution-detail-tags">
                  {selectedSolution.tags.map((tag) => (
                    <span key={tag} className="tag solution-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedSolution.content ? (
                <SolutionContent html={selectedSolution.content} />
              ) : (
                <p className="muted">No preview available.</p>
              )}

              <a
                className="solution-link"
                href={`https://leetcode.com/problems/${problem.slug}/solutions/${selectedSolution.id}/`}
                target="_blank"
                rel="noreferrer"
              >
                Open on LeetCode ↗
              </a>
            </div>
          ) : (
            <ul className="solution-list">
              {solutions?.map((s) => (
                <li key={s.id} className="solution-item">
                  <button
                    type="button"
                    className="solution-item-header"
                    onClick={() => setSelectedSolution(s)}
                  >
                    <span className="solution-title">{s.title}</span>
                    <div className="solution-item-meta">
                      {s.author && <span className="solution-author">@{s.author}</span>}
                      <SolutionStats votes={s.voteCount} views={s.viewCount} />
                    </div>
                    {s.tags.length > 0 && (
                      <div className="solution-item-tags">
                        {s.tags.map((tag) => (
                          <span key={tag} className="tag solution-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'submissions' && (
        <div className="problem-tab-panel">
          {loading && !submissions && <p className="muted">Loading submissions…</p>}
          {displaySubmissions?.length === 0 && <p className="muted">No submissions for this problem yet.</p>}
          {displaySubmissions && displaySubmissions.length > 0 && (
            <div className="submissions-table">
              <div className="submissions-header">
                <span className="col-idx">#</span>
                <span className="col-status">Status</span>
                <span className="col-lang">Lang</span>
                <span className="col-runtime">Runtime</span>
                <span className="col-memory">Memory</span>
              </div>
              {displaySubmissions.map((s, i) => {
                const accepted = isAccepted(s.statusDisplay)
                return (
                  <div key={s.id} className="submission-row-wrap">
                    <button
                      type="button"
                      className={`submissions-row ${selectedSubmission?.id === s.id ? 'active' : ''}`}
                      onClick={() => openSubmission(s)}
                    >
                      <span className="col-idx">{i + 1}</span>
                      <span className="col-status">
                        <span className={`status-label ${statusClass(s.statusDisplay)}`}>
                          {s.statusDisplay}
                        </span>
                        <span className="status-date">{formatRelativeTime(s.timestamp)}</span>
                      </span>
                      <span className="col-lang">
                        <span className="lang-pill">{s.lang}</span>
                      </span>
                      <span className="col-runtime">
                        <span className="metric-icon" aria-hidden="true">
                          ⏱
                        </span>
                        {metricOrNa(s.runtime, accepted)}
                      </span>
                      <span className="col-memory">
                        <span className="metric-icon" aria-hidden="true">
                          ◫
                        </span>
                        {metricOrNa(s.memory, accepted)}
                      </span>
                    </button>
                    {selectedSubmission?.id === s.id && submissionDetail && (
                      <div className="submission-detail">
                        <div className="submission-detail-meta">
                          {submissionDetail.runtimeDisplay && (
                            <span>Runtime: {submissionDetail.runtimeDisplay}</span>
                          )}
                          {submissionDetail.memoryDisplay && (
                            <span>Memory: {submissionDetail.memoryDisplay}</span>
                          )}
                        </div>
                        <pre className="submission-code">{submissionDetail.code}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
