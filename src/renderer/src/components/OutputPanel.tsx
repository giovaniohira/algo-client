import { useEffect, useMemo, useState } from 'react'
import type { JudgeResult } from '../../../../preload/index.d'
import { formatJudgeSummary, judgeErrorDetail } from '../lib/judge-result'
import {
  fieldsToInput,
  linesToFields,
  paramNamesFromSnippet,
  parseExampleTestcases
} from '../lib/test-cases'

interface Props {
  error: string | null
  runResult: JudgeResult | null
  submitOutcome: string | null
  testInput: string
  onTestInputChange: (value: string) => void
  sampleTestCase: string
  exampleTestcases: string
  starterCode?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  runTick?: number
}

type Tab = 'testcase' | 'result'

function resultStatusClass(result: JudgeResult | null, submitOutcome: string | null): string {
  if (submitOutcome === 'accepted') return 'accepted'
  if (!result) return 'idle'
  const msg = result.statusMsg.toLowerCase()
  if (msg.includes('accept')) return 'accepted'
  if (msg.includes('wrong')) return 'wrong'
  if (msg.includes('runtime') || msg.includes('compile')) return 'error'
  if (msg.includes('time limit')) return 'tle'
  return 'other'
}

function resultHeadline(result: JudgeResult | null, submitOutcome: string | null): string {
  if (submitOutcome === 'accepted') return 'Accepted'
  if (submitOutcome) return `Submit: ${submitOutcome}`
  if (result) return result.statusMsg
  return 'Test Result'
}

export function OutputPanel({
  error,
  runResult,
  submitOutcome,
  testInput,
  onTestInputChange,
  sampleTestCase,
  exampleTestcases,
  starterCode = '',
  collapsed: collapsedProp,
  onCollapsedChange,
  runTick = 0
}: Props) {
  const [collapsedLocal, setCollapsedLocal] = useState(false)
  const collapsed = collapsedProp ?? collapsedLocal
  const setCollapsed = onCollapsedChange ?? setCollapsedLocal
  const [tab, setTab] = useState<Tab>('testcase')
  const [activeCase, setActiveCase] = useState(0)
  const [cases, setCases] = useState<string[]>([''])

  const paramNames = useMemo(() => paramNamesFromSnippet(starterCode), [starterCode])

  const parsedCases = useMemo(() => {
    const raw = exampleTestcases.trim() || sampleTestCase.trim()
    const parsed = parseExampleTestcases(raw, paramNames.length)
    return parsed.length ? parsed : ['']
  }, [exampleTestcases, sampleTestCase, paramNames.length])

  const caseFields = useMemo(
    () => cases.map((c) => linesToFields(c.split('\n'), paramNames)),
    [cases, paramNames]
  )

  useEffect(() => {
    setCases(parsedCases)
    setActiveCase(0)
    if (parsedCases[0]) onTestInputChange(parsedCases[0])
  }, [parsedCases]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (runTick > 0) setTab('result')
  }, [runTick])

  const selectCase = (idx: number) => {
    setActiveCase(idx)
    onTestInputChange(cases[idx] ?? '')
  }

  const addCase = () => {
    const blank = paramNames.length ? paramNames.map(() => '').join('\n') : ''
    const next = [...cases, blank]
    setCases(next)
    setActiveCase(next.length - 1)
    onTestInputChange(blank)
  }

  const updateField = (caseIdx: number, fieldIdx: number, value: string) => {
    const fields = [...caseFields[caseIdx]]
    fields[fieldIdx] = { ...fields[fieldIdx], value }
    const nextInput = fieldsToInput(fields)
    const nextCases = [...cases]
    nextCases[caseIdx] = nextInput
    setCases(nextCases)
    setActiveCase(caseIdx)
    onTestInputChange(nextInput)
  }

  const hasDiff = Boolean(
    runResult?.lastTestcase || runResult?.expectedOutput || runResult?.codeOutput?.length
  )
  const detail = judgeErrorDetail(runResult)
  const statusClass = resultStatusClass(runResult, submitOutcome)
  const activeFields = caseFields[activeCase] ?? []

  return (
    <div className={`output-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="output-header">
        <div className="output-tabs">
          <button
            type="button"
            className={`output-tab ${tab === 'testcase' ? 'active' : ''}`}
            onClick={() => setTab('testcase')}
          >
            <span className="output-tab-icon output-tab-icon-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l2.5 2.5L16 9" />
              </svg>
            </span>
            Testcase
          </button>
          <button
            type="button"
            className={`output-tab ${tab === 'result' ? 'active' : ''}`}
            onClick={() => setTab('result')}
          >
            <span className="output-tab-icon output-tab-icon-terminal" aria-hidden="true">
              &gt;_
            </span>
            Test Result
          </button>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm output-collapse"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand output' : 'Collapse output'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && tab === 'testcase' && (
        <>
          <div className="testcase-cases">
            {cases.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`testcase-case-tab ${activeCase === i ? 'active' : ''}`}
                onClick={() => selectCase(i)}
              >
                Case {i + 1}
              </button>
            ))}
            <button type="button" className="testcase-case-add" onClick={addCase} aria-label="Add test case">
              +
            </button>
          </div>

          <div className="output-body output-testcase-body">
            <div className="testcase-fields">
              {paramNames.length === 0 && activeFields.length === 0 ? (
                <textarea
                  className="testcase-field-input testcase-field-textarea"
                  value={testInput}
                  onChange={(e) => onTestInputChange(e.target.value)}
                  spellCheck={false}
                  placeholder="No sample test cases for this problem."
                />
              ) : (
                activeFields.map((field, i) => (
                  <label key={i} className="testcase-field">
                    <span className="testcase-field-name">{field.name} =</span>
                    <input
                      className="testcase-field-input"
                      value={field.value}
                      onChange={(e) => updateField(activeCase, i, e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {!collapsed && tab === 'result' && (
        <div className="output-body output-result-body">
          {error && <p className="output-line output-error">{error}</p>}

          {(runResult || submitOutcome) && (
            <div className={`result-status-header ${statusClass}`}>
              {resultHeadline(runResult, submitOutcome)}
            </div>
          )}

          {submitOutcome && submitOutcome !== 'accepted' && (
            <p className="output-line output-warn">Submit: {submitOutcome}</p>
          )}

          {submitOutcome === 'accepted' && runResult?.statusRuntime && (
            <p className="output-line output-success-meta">
              {runResult.statusRuntime}
              {runResult.statusMemory ? ` · ${runResult.statusMemory}` : ''}
            </p>
          )}

          {detail && <pre className="output-detail">{detail}</pre>}

          {runResult && !submitOutcome && !detail && (
            <p className="output-line output-info">{formatJudgeSummary(runResult)}</p>
          )}

          {hasDiff && (
            <div className="output-diff">
              {runResult?.lastTestcase && (
                <div className="output-diff-block">
                  <div className="result-section-head">
                    <span className="output-label">Last Executed Input</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        onTestInputChange(runResult.lastTestcase!)
                        setTab('testcase')
                      }}
                    >
                      Open Testcase
                    </button>
                  </div>
                  <pre>{runResult.lastTestcase}</pre>
                </div>
              )}
              {runResult?.codeOutput && (
                <div className="output-diff-block">
                  <span className="output-label">Output</span>
                  <pre>{runResult.codeOutput.join('\n')}</pre>
                </div>
              )}
              {runResult?.expectedOutput && (
                <div className="output-diff-block">
                  <span className="output-label">Expected</span>
                  <pre>{runResult.expectedOutput}</pre>
                </div>
              )}
            </div>
          )}

          {runResult?.stdOutput && !hasDiff && !detail && (
            <div className="output-diff-block">
              <span className="output-label">Stdout</span>
              <pre>{runResult.stdOutput}</pre>
            </div>
          )}

          {!error && !runResult && !submitOutcome && (
            <div className="output-empty">
              <p className="output-empty-message">Run or Submit to see results here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
