import { useCallback, useEffect, useRef, useState } from 'react'
import type { JudgeResult, ProblemDetail, Profile } from '../../../preload/index.d'
import { CodeEditor } from './components/CodeEditor'
import { LoginScreen } from './components/LoginScreen'
import { ElectronRequired } from './components/ElectronRequired'
import { Header } from './components/Header'
import { AppNav, type AppView } from './components/AppNav'
import { HomeScreen } from './components/HomeScreen'
import { ProfileScreen } from './components/ProfileScreen'
import { hasApi, api } from './lib/api'
import { TitleBar } from './components/TitleBar'
import { TitleBarBrand } from './components/TitleBarBrand'
import { ProblemPicker } from './components/ProblemPicker'
import { OutputPanel } from './components/OutputPanel'
import { ProblemSidebar } from './components/ProblemSidebar'
import { loadDraft, saveDraft } from './lib/drafts'
import { ensureFirstLogin, latestDraftTouch, recordSubmission, touchDraft } from './lib/recent'
import { isSessionError, isLoginCancelled } from './lib/session'
import { ensureMonaco } from './lib/monaco-setup'
import { useSplitResize } from './lib/split-resize'
import { parseExampleTestcases, paramNamesFromSnippet } from './lib/test-cases'

const OUTPUT_HEADER_H = 36

const LANGS = [
  { label: 'Python 3', slug: 'python3' },
  { label: 'JavaScript', slug: 'javascript' },
  { label: 'TypeScript', slug: 'typescript' },
  { label: 'Java', slug: 'java' },
  { label: 'C++', slug: 'cpp' },
  { label: 'Go', slug: 'golang' },
  { label: 'Rust', slug: 'rust' }
]

function starterFor(problem: ProblemDetail, langSlug: string): string {
  const snippet = problem.codeSnippets.find((s) => s.langSlug === langSlug)
  return snippet?.code ?? problem.codeSnippets[0]?.code ?? ''
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<AppView>('home')
  const [loading, setLoading] = useState(true)
  const [slugInput, setSlugInput] = useState('two-sum')
  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [problemTotal, setProblemTotal] = useState(0)
  const [problemSlugs, setProblemSlugs] = useState<string[]>([])
  const [lang, setLang] = useState('python3')
  const [code, setCode] = useState('')
  const [testInput, setTestInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<JudgeResult | null>(null)
  const [submitOutcome, setSubmitOutcome] = useState<string | null>(null)
  const [catalogSyncing, setCatalogSyncing] = useState(false)
  const [catalogProgress, setCatalogProgress] = useState<{ done: number; total: number } | null>(null)
  const [catalogMissing, setCatalogMissing] = useState(false)
  const [outputCollapsed, setOutputCollapsed] = useState(false)
  const [runTick, setRunTick] = useState(0)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const editorStackRef = useRef<HTMLDivElement>(null)

  const sidebarSplit = useSplitResize(workspaceRef, 'vertical', {
    initial: Math.round(window.innerWidth * 0.44),
    min: 280,
    maxRatio: 0.65,
    storageKey: 'split:sidebar',
    measure: (rect, x) => x - rect.left
  })

  const outputSplit = useSplitResize(editorStackRef, 'horizontal', {
    initial: 240,
    min: 100,
    maxRatio: 0.75,
    storageKey: 'split:output',
    measure: (rect, _, y) => rect.bottom - y
  })

  useEffect(() => {
    if (profile) void ensureMonaco()
  }, [profile])

  const refreshCatalogMeta = useCallback(async () => {
    if (!hasApi()) return
    const client = api()
    const [status, slugs, list] = await Promise.all([
      client.catalogStatus(),
      client.catalogSlugs(),
      client.listProblems()
    ])
    setProblemTotal(list.total)
    setProblemSlugs(slugs)
    setCatalogMissing(!status.exists && status.total === 0)
    setCatalogSyncing(status.syncing)
  }, [])

  const handleSessionExpired = useCallback(() => {
    setProfile(null)
    setProblem(null)
    setError('Session expired — please sign in again.')
  }, [])

  const handleError = useCallback(
    (e: unknown, fallback: string) => {
      const message = e instanceof Error ? e.message : fallback
      if (isSessionError(message)) {
        handleSessionExpired()
        return
      }
      setError(message)
    },
    [handleSessionExpired]
  )

  const checkAuth = useCallback(async () => {
    if (!hasApi()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const status = await api().authStatus()
      if (status.authenticated) {
        setProfile(status.profile)
        ensureFirstLogin()
      } else {
        setProfile(null)
        if (status.error) setError(status.error)
      }
    } catch (e) {
      handleError(e, 'Failed to verify session')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    void checkAuth()
    void refreshCatalogMeta()
  }, [checkAuth, refreshCatalogMeta])

  useEffect(() => {
    if (!hasApi()) return
    const client = api()
    const offProgress = client.onCatalogSyncProgress((p) => {
      setCatalogSyncing(true)
      setCatalogProgress({ done: p.done, total: p.total })
    })
    const offDone = client.onCatalogSyncDone(() => {
      setCatalogSyncing(false)
      setCatalogProgress(null)
      void refreshCatalogMeta()
    })
    return () => {
      offProgress()
      offDone()
    }
  }, [refreshCatalogMeta])

  useEffect(() => {
    if (profile) void refreshCatalogMeta()
  }, [profile, refreshCatalogMeta])

  const handleLogin = async () => {
    setError(null)
    setLoginBusy(true)
    try {
      const p = await api().authLogin()
      setProfile(p)
      ensureFirstLogin()
      setView('home')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (isLoginCancelled(message)) return
      handleError(e, 'Login failed')
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    await api().authLogout()
    setProfile(null)
    setProblem(null)
  }

  const loadProblem = async (slug?: string) => {
    const target = (slug ?? slugInput).trim()
    if (!target) return
    setSlugInput(target)
    setError(null)
    setRunResult(null)
    setSubmitOutcome(null)
    setBusy(true)
    try {
      const { problem: p } = await api().loadProblem(target)
      setProblem(p)
      const starter = starterFor(p, lang)
      const paramCount = paramNamesFromSnippet(starter).length
      const raw = p.exampleTestcases.trim() || p.sampleTestCase.trim()
      const cases = parseExampleTestcases(raw, paramCount)
      setTestInput(cases[0] ?? p.sampleTestCase)
      const draft = loadDraft(p.slug, lang)
      setCode(draft ?? starter)
      touchDraft(p.slug, lang)
    } catch (e) {
      handleError(e, 'Failed to load problem')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (view !== 'workspace' || problem || busy) return
    const touch = latestDraftTouch()
    if (touch) void loadProblem(touch.slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, profile])

  const openProblem = (slug: string) => {
    setView('workspace')
    void loadProblem(slug)
  }

  const openRandomProblem = () => {
    if (problemSlugs.length === 0) {
      setView('workspace')
      return
    }
    const slug = problemSlugs[Math.floor(Math.random() * problemSlugs.length)]
    openProblem(slug)
  }

  const handleLangChange = (newLang: string) => {
    if (problem) saveDraft(problem.slug, lang, code)
    setLang(newLang)
    if (problem) {
      const draft = loadDraft(problem.slug, newLang)
      setCode(draft ?? starterFor(problem, newLang))
    }
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    if (!problem) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => saveDraft(problem.slug, lang, value), 400)
  }

  const handleRun = async () => {
    if (!problem) return
    setBusy(true)
    setError(null)
    setRunResult(null)
    setSubmitOutcome(null)
    try {
      const result = await api().runCode(
        problem.slug,
        parseInt(problem.questionId, 10),
        lang,
        code,
        testInput || problem.sampleTestCase
      )
      setRunResult(result)
      setRunTick((n) => n + 1)
    } catch (e) {
      handleError(e, 'Run failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem) return
    setBusy(true)
    setError(null)
    setSubmitOutcome(null)
    try {
      const { result, outcome } = await api().submitCode(
        problem.slug,
        parseInt(problem.questionId, 10),
        lang,
        code
      )
      setRunResult(result)
      setRunTick((n) => n + 1)
      setSubmitOutcome(outcome)
      if (problem) {
        saveDraft(problem.slug, lang, code)
        recordSubmission(problem.slug, problem.title, problem.difficulty, outcome, lang)
      }
    } catch (e) {
      handleError(e, 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  const navigateProblem = (delta: number) => {
    if (!problem || problemSlugs.length === 0) return
    const idx = problemSlugs.indexOf(problem.slug)
    if (idx < 0) return
    const next = problemSlugs[idx + delta]
    if (next) void loadProblem(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit()
      } else if (e.ctrlKey && e.key === "'") {
        e.preventDefault()
        void handleRun()
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateProblem(-1)
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        navigateProblem(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const problemIndex = problem ? problemSlugs.indexOf(problem.slug) : -1
  const hasPrev = problemIndex > 0
  const hasNext = problemIndex >= 0 && problemIndex < problemSlugs.length - 1

  if (!hasApi()) {
    return <ElectronRequired />
  }

  if (loading) {
    return (
      <div className="screen screen-chrome">
        <TitleBar minimal>
          <TitleBarBrand compact />
        </TitleBar>
        <div className="screen-body center">
          <span className="loading-dot">Loading</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <LoginScreen error={error} loggingIn={loginBusy} onLogin={() => void handleLogin()} />
  }

  return (
    <div className="app screen-chrome">
      {(catalogMissing || catalogSyncing) && (
        <div className="catalog-banner">
          {catalogSyncing && catalogProgress ? (
            <span>
              Syncing problem catalog… {catalogProgress.done}/{catalogProgress.total}
            </span>
          ) : catalogMissing ? (
            <span>
              Problem catalog missing.{' '}
              <button type="button" className="link-btn" onClick={() => void api().syncCatalog()}>
                Sync now
              </button>
            </span>
          ) : (
            <span>Updating problem catalog…</span>
          )}
        </div>
      )}

      <div className="app-shell">
        <AppNav active={view} onNavigate={setView} />

        <div className="app-shell-main">
          {view === 'home' && (
            <div className="dash-view">
              <TitleBar minimal />
              <HomeScreen
                profile={profile}
                onOpenProblem={openProblem}
                onOpenProfile={() => setView('profile')}
                onBrowse={() => setView('workspace')}
                onRandom={openRandomProblem}
              />
            </div>
          )}

          {view === 'profile' && (
            <div className="dash-view">
              <TitleBar minimal />
              <ProfileScreen
                profile={profile}
                onLogout={() => void handleLogout()}
              />
            </div>
          )}

          {view === 'workspace' && (
            <div className="app-workspace">
              <ProblemPicker
                problem={problem}
                busy={busy}
                isPremium={profile.isPremium}
                onSelect={(slug) => void loadProblem(slug)}
              >
                {(parts) => (
                  <>
                    <Header profile={profile} onLogout={() => void handleLogout()} leftSlot={parts.trigger} />
                    {parts.panel}
                  </>
                )}
              </ProblemPicker>

              <div className="workspace screen-body" ref={workspaceRef}>
                <aside className="sidebar" style={{ width: sidebarSplit.size }}>
                  {problem ? (
                    <ProblemSidebar problem={problem} />
                  ) : (
                    <div className="empty-state">
                      <p>Escolha um problema no header para começar.</p>
                      {problemTotal === 0 && (
                        <p className="muted">Sem catálogo local — sincronize para navegar a lista completa.</p>
                      )}
                    </div>
                  )}
                </aside>

                <div
                  className="split-handle split-handle-v"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize problem panel"
                  onPointerDown={sidebarSplit.startDrag}
                />

                <main className="editor-pane">
                  <div className="editor-toolbar">
                    <div className="problem-nav">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={!hasPrev || busy}
                        onClick={() => navigateProblem(-1)}
                        title="Previous problem (Alt+←)"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={!hasNext || busy}
                        onClick={() => navigateProblem(1)}
                        title="Next problem (Alt+→)"
                      >
                        ›
                      </button>
                    </div>

                    <select
                      className="lang-select"
                      value={lang}
                      onChange={(e) => handleLangChange(e.target.value)}
                      disabled={busy}
                    >
                      {LANGS.map((l) => (
                        <option key={l.slug} value={l.slug}>
                          {l.label}
                        </option>
                      ))}
                    </select>

                    <div className="spacer" />

                    <button className="btn btn-run" onClick={() => void handleRun()} disabled={!problem || busy} title="Ctrl+'">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Run
                    </button>
                    <button
                      className="btn btn-submit"
                      onClick={() => void handleSubmit()}
                      disabled={!problem || busy}
                      title="Ctrl+Enter"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Submit
                    </button>
                  </div>

                  <div className="editor-stack" ref={editorStackRef}>
                    <div className="editor-wrap">
                      <CodeEditor lang={lang} code={code} onChange={handleCodeChange} />
                    </div>

                    <div
                      className="split-handle split-handle-h"
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="Resize output panel"
                      onPointerDown={outputSplit.startDrag}
                    />

                    <div
                      className="output-resize-wrap"
                      style={{ height: outputCollapsed ? OUTPUT_HEADER_H : outputSplit.size }}
                    >
                      <OutputPanel
                        error={error}
                        runResult={runResult}
                        submitOutcome={submitOutcome}
                        testInput={testInput}
                        onTestInputChange={setTestInput}
                        sampleTestCase={problem?.sampleTestCase ?? ''}
                        exampleTestcases={problem?.exampleTestcases ?? ''}
                        starterCode={problem ? starterFor(problem, lang) : ''}
                        collapsed={outputCollapsed}
                        onCollapsedChange={setOutputCollapsed}
                        runTick={runTick}
                      />
                    </div>
                  </div>
                </main>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
