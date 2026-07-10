import type { ReactElement } from 'react'

export type AppView = 'home' | 'workspace' | 'profile'

interface Props {
  active: AppView
  onNavigate: (view: AppView) => void
}

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

function IconCode() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const ITEMS: Array<{ view: AppView; label: string; icon: () => ReactElement }> = [
  { view: 'home', label: 'Home', icon: IconHome },
  { view: 'workspace', label: 'Problems', icon: IconCode },
  { view: 'profile', label: 'Profile', icon: IconUser }
]

export function AppNav({ active, onNavigate }: Props) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      {ITEMS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          className={`app-nav-btn${active === view ? ' is-active' : ''}`}
          onClick={() => onNavigate(view)}
          aria-label={label}
          aria-current={active === view ? 'page' : undefined}
          title={label}
        >
          <Icon />
        </button>
      ))}
    </nav>
  )
}
