import { useCallback, useEffect, useState } from 'react'

import Editor from '@monaco-editor/react'

import type { JudgeResult, ProblemDetail, Profile } from '../../../preload/index.d'

import { LoginScreen } from './components/LoginScreen'

import { Header } from './components/Header'

import { TitleBar } from './components/TitleBar'

import { ProblemPicker } from './components/ProblemPicker'

import { formatJudgeSummary, judgeErrorDetail } from './lib/judge-result'

import { setupMonaco, monacoLanguage } from './lib/monaco-setup'
import { editorHighlightOptions } from './lib/monaco-theme'



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

  const [loading, setLoading] = useState(true)

  const [slugInput, setSlugInput] = useState('two-sum')

  const [problem, setProblem] = useState<ProblemDetail | null>(null)

  const [problemId, setProblemId] = useState<number | null>(null)

  const [problemTotal, setProblemTotal] = useState(0)

  const [lang, setLang] = useState('python3')

  const [code, setCode] = useState('')

  const [sessionActive, setSessionActive] = useState(false)

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [runResult, setRunResult] = useState<JudgeResult | null>(null)

  const [submitOutcome, setSubmitOutcome] = useState<string | null>(null)

  const [hintsUsed, setHintsUsed] = useState(0)



  const checkAuth = useCallback(async () => {

    setLoading(true)

    try {

      const status = await window.algoClient.authStatus()

      if (status.authenticated) {

        setProfile(status.profile)

      } else {

        setProfile(null)

        if (status.error) setError(status.error)

      }

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Erro ao verificar sessão')

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    void checkAuth()

  }, [checkAuth])



  useEffect(() => {

    void window.algoClient.listProblems().then((d) => setProblemTotal(d.total))

  }, [profile])



  const handleLogin = async () => {

    setError(null)

    try {

      const p = await window.algoClient.authLogin()

      setProfile(p)

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Login falhou')

    }

  }



  const handleLogout = async () => {

    await window.algoClient.authLogout()

    setProfile(null)

    setProblem(null)

    setSessionActive(false)

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

      const { problem: p, problemId: id } = await window.algoClient.loadProblem(target)

      setProblem(p)

      setProblemId(id)

      const starter = starterFor(p, lang)

      setCode(starter)

      await window.algoClient.startSession(id, lang, starter)

      setSessionActive(true)

      setHintsUsed(0)

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Falha ao carregar problema')

    } finally {

      setBusy(false)

    }

  }



  useEffect(() => {

    if (profile && !problem && !busy) void loadProblem('two-sum')

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [profile])



  const handleLangChange = (newLang: string) => {

    setLang(newLang)

    if (problem) setCode(starterFor(problem, newLang))

  }



  const handleRun = async () => {

    if (!problem || !problemId) return

    setBusy(true)

    setError(null)

    setRunResult(null)

    try {

      const result = await window.algoClient.runCode(

        problem.slug,

        parseInt(problem.questionId, 10),

        lang,

        code,

        problem.sampleTestCase

      )

      setRunResult(result)

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Run falhou')

    } finally {

      setBusy(false)

    }

  }



  const handleSubmit = async () => {

    if (!problem || !problemId) return

    setBusy(true)

    setError(null)

    setSubmitOutcome(null)

    try {

      const { result, outcome } = await window.algoClient.submitCode(

        problem.slug,

        parseInt(problem.questionId, 10),

        lang,

        code,

        problemId

      )

      setRunResult(result)

      setSubmitOutcome(outcome)

      setSessionActive(false)

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Submit falhou')

    } finally {

      setBusy(false)

    }

  }



  const handleHint = async () => {

    const level = Math.min(hintsUsed + 1, 3)

    await window.algoClient.recordHint(level)

    setHintsUsed(level)

  }



  const handleSolutionViewed = async () => {

    await window.algoClient.recordSolutionViewed()

  }



  if (loading) {

    return (

      <div className="screen screen-chrome">

        <TitleBar minimal />

        <div className="screen-body center">

          <span className="loading-dot">Carregando</span>

        </div>

      </div>

    )

  }



  if (!profile) {

    return <LoginScreen error={error} onLogin={() => void handleLogin()} />

  }



  const showToast = Boolean(error || runResult || submitOutcome)



  return (

    <div className="app">

      <ProblemPicker
        problem={problem}
        busy={busy}
        isPremium={profile.isPremium}
        onSelect={(slug) => void loadProblem(slug)}
      >
        {(parts) => (
          <>
            <Header
              profile={profile}
              sessionActive={sessionActive}
              onLogout={() => void handleLogout()}
              leftSlot={parts.trigger}
            />
            {parts.panel}
          </>
        )}
      </ProblemPicker>



      <div className="workspace">

        <aside className="sidebar">

          {problem ? (

            <>

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

              <div

                className="problem-content"

                dangerouslySetInnerHTML={{ __html: problem.content }}

              />

              <div className="session-tools">

                <button

                  className="btn btn-ghost btn-sm"

                  onClick={() => void handleHint()}

                  disabled={!sessionActive}

                >

                  Dica ({hintsUsed})

                </button>

                <button

                  className="btn btn-ghost btn-sm"

                  onClick={() => void handleSolutionViewed()}

                  disabled={!sessionActive}

                >

                  Vi a solução

                </button>

              </div>

            </>

          ) : (

            <div className="empty-state">

              <p>Busque um problema no header para começar.</p>

            </div>

          )}

        </aside>



        <main className="editor-pane">

          <div className="editor-toolbar">

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

            <button

              className="btn btn-run"

              onClick={() => void handleRun()}

              disabled={!problem || busy}

            >

              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">

                <path d="M8 5v14l11-7z" />

              </svg>

              Run

            </button>

            <button

              className="btn btn-submit"

              onClick={() => void handleSubmit()}

              disabled={!problem || busy}

            >

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                <path d="M20 6L9 17l-5-5" />

              </svg>

              Submit

            </button>

          </div>



          <div className="editor-wrap">

            <Editor

              height="100%"

              language={monacoLanguage(lang)}

              value={code}

              onChange={(v) => setCode(v ?? '')}

              theme="dsa-nord"

              beforeMount={setupMonaco}

              options={editorHighlightOptions}

            />

          </div>



          {showToast && (

            <div className={`result-toast ${submitOutcome === 'accepted' ? 'success' : ''}`}>

              {error && <p className="toast-error">{error}</p>}

              {submitOutcome && (

                <p className={submitOutcome === 'accepted' ? 'toast-success' : 'toast-warn'}>

                  {submitOutcome === 'accepted' && (

                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                      <path d="M20 6L9 17l-5-5" />

                    </svg>

                  )}

                  {submitOutcome === 'accepted' ? 'Accepted' : `Submit: ${submitOutcome}`}

                  {runResult?.statusRuntime && submitOutcome === 'accepted' && (

                    <span className="toast-meta"> · {runResult.statusRuntime}</span>

                  )}

                </p>

              )}

              {runResult && !submitOutcome && (

                <p className="toast-info">{formatJudgeSummary(runResult)}</p>

              )}

              {judgeErrorDetail(runResult) && (

                <pre className="toast-detail">{judgeErrorDetail(runResult)}</pre>

              )}

            </div>

          )}

        </main>

      </div>

    </div>

  )

}

