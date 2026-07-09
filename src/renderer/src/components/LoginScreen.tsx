import { useEffect, useState } from 'react'
import { FadeIn } from './FadeIn'
import { LogoMark } from './LogoMark'
import { TitleBar } from './TitleBar'
import { TitleBarBrand } from './TitleBarBrand'
import { api, hasApi } from '../lib/api'

const LANG_COUNT = 7

function IconCode() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

interface Props {
  error: string | null
  onLogin: () => void
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k+`
  return n.toLocaleString()
}

export function LoginScreen({ error, onLogin }: Props) {
  const [problemTotal, setProblemTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!hasApi()) return
    api()
      .catalogStatus()
      .then((s) => {
        if (s.total > 0) setProblemTotal(s.total)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="screen screen-chrome">
      <TitleBar minimal>
        <TitleBarBrand />
      </TitleBar>
      <div className="screen-body login-layout">
        <div className="login-backdrop" aria-hidden="true">
          <div className="login-backdrop-grid" />
          <div className="login-backdrop-vignette" />
        </div>

        <section className="login-hero" aria-label="About Algo Client">
          <FadeIn className="login-hero-inner" delay={60}>
            <div className="login-hero-brand">
              <LogoMark size={56} />
              <span className="login-hero-name">Algo Client</span>
            </div>
            <h1 className="login-headline">
              LeetCode,
              <br />
              on your <span className="login-headline-accent">desktop</span>.
            </h1>
            <p className="login-lede">
              A focused environment to solve problems without browser distractions.
            </p>
          </FadeIn>
          <FadeIn className="login-stats-wrap" delay={140}>
            <dl className="login-stats">
              <div className="login-stat">
                <span className="login-stat-icon"><IconCode /></span>
                <div>
                  <dt>Problems</dt>
                  <dd>{problemTotal ? formatCount(problemTotal) : '—'}</dd>
                </div>
              </div>
              <div className="login-stat">
                <span className="login-stat-icon"><IconGlobe /></span>
                <div>
                  <dt>Languages</dt>
                  <dd>{LANG_COUNT}</dd>
                </div>
              </div>
            </dl>
          </FadeIn>
        </section>

        <section className="login-panel" aria-label="Sign in">
          <FadeIn className="login-form" delay={200}>
            <div className="login-form-icon"><IconLock /></div>
            <h2>Sign in</h2>
            <p className="login-form-sub">Use your existing LeetCode account</p>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="btn btn-submit login-cta" type="button" onClick={onLogin}>
              Continue with LeetCode
            </button>
          </FadeIn>
          <p className="login-disclaimer">
            Not affiliated with, endorsed by, or connected to LeetCode.
          </p>
        </section>
      </div>
    </div>
  )
}
