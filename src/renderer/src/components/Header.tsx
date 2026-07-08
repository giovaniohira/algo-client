import type { ReactNode } from 'react'
import type { Profile } from '../../../../preload/index.d'
import { Timer } from './Timer'
import { WindowControls } from './WindowControls'

interface Props {
  profile: Profile
  sessionActive: boolean
  onLogout: () => void
  leftSlot?: ReactNode
}

export function Header({ profile, sessionActive, onLogout, leftSlot }: Props) {
  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <header className="header titlebar">
      <div className="header-left">{leftSlot}</div>

      <div className="header-right">
        {sessionActive && <Timer />}
        <div className="stat-pill" title="Ranking">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
          <span>{profile.ranking.toLocaleString('pt-BR')}</span>
        </div>
        <div className="stat-pill" title="Resolvidos">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
          </svg>
          <span>{profile.solved}</span>
        </div>
        {profile.avatarUrl ? (
          <img className="avatar" src={profile.avatarUrl} alt={profile.username} />
        ) : (
          <div className="avatar avatar-fallback">{initials}</div>
        )}
        <button className="btn btn-ghost" onClick={onLogout}>
          Sair
        </button>
        <WindowControls />
      </div>
    </header>
  )
}
