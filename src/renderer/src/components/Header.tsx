import { useEffect, useState, type ReactNode } from 'react'
import type { Profile } from '../../../../preload/index.d'
import { api } from '../lib/api'
import { WindowControls } from './WindowControls'

const ZOOM_MIN_PCT = 75
const ZOOM_MAX_PCT = 175

interface Props {
  profile: Profile
  onLogout: () => void
  leftSlot?: ReactNode
}

function zoomPercent(factor: number): number {
  return Math.round(factor * 100)
}

export function Header({ profile, onLogout, leftSlot }: Props) {
  const initials = profile.username.slice(0, 2).toUpperCase()
  const [zoomPct, setZoomPct] = useState(100)

  useEffect(() => {
    void api()
      .zoomGet()
      .then((f) => setZoomPct(zoomPercent(f)))
    return api().onZoomChanged((f) => setZoomPct(zoomPercent(f)))
  }, [])

  return (
    <header className="header titlebar">
      <div className="header-left">{leftSlot}</div>

      <div className="header-right">
        <div className="ui-zoom" title="Ctrl + / Ctrl - / Ctrl 0">
          <button
            type="button"
            className="btn btn-ghost btn-sm ui-zoom-btn"
            disabled={zoomPct <= ZOOM_MIN_PCT}
            onClick={() => void api().zoomOut()}
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="ui-zoom-size">{zoomPct}%</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm ui-zoom-btn"
            disabled={zoomPct >= ZOOM_MAX_PCT}
            onClick={() => void api().zoomIn()}
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>

        <div className="stat-pill" title="Ranking">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
          <span>{profile.ranking.toLocaleString('en-US')}</span>
        </div>
        <div className="stat-pill" title="Solved">
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
          Sign out
        </button>
        <WindowControls />
      </div>
    </header>
  )
}
