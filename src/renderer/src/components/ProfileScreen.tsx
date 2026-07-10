import { useEffect, useState } from 'react'
import type { LeetCodeBadge, Profile } from '../../../../preload/index.d'
import { ensureFirstLogin } from '../lib/recent'

interface Props {
  profile: Profile
  onLogout: () => void
}

function badgeIconUrl(icon?: string | null): string | null {
  if (!icon) return null
  if (icon.startsWith('http')) return icon
  if (icon.startsWith('//')) return `https:${icon}`
  return `https://leetcode.com${icon.startsWith('/') ? '' : '/'}${icon}`
}

function BadgeIcon({ icon, className }: { icon?: string | null; className: string }) {
  const src = badgeIconUrl(icon)
  if (!src) {
    return (
      <span className={`${className} dash-badge-icon-fallback`} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      </span>
    )
  }
  return <img src={src} alt="" className={className} />
}

function Donut({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  const total = easy + medium + hard || 1
  const easyPct = easy / total
  const medPct = medium / total
  const r = 44
  const c = 2 * Math.PI * r
  const easyLen = c * easyPct
  const medLen = c * medPct
  const hardLen = c - easyLen - medLen
  return (
    <div className="dash-donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120" className="dash-donut">
        <circle cx="60" cy="60" r={r} className="dash-donut-track" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="dash-donut-seg tone-easy"
          strokeDasharray={`${easyLen} ${c - easyLen}`}
          strokeDashoffset={0}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="dash-donut-seg tone-medium"
          strokeDasharray={`${medLen} ${c - medLen}`}
          strokeDashoffset={-easyLen}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="dash-donut-seg tone-hard"
          strokeDasharray={`${hardLen} ${c - hardLen}`}
          strokeDashoffset={-(easyLen + medLen)}
        />
      </svg>
      <div className="dash-donut-center">
        <strong>{easy + medium + hard}</strong>
      </div>
    </div>
  )
}

function BadgeItem({ badge, active }: { badge: LeetCodeBadge; active?: boolean }) {
  return (
    <div className={`dash-badge${active ? ' is-active' : ''}`} title={badge.displayName}>
      <BadgeIcon icon={badge.icon} className="dash-badge-icon" />
      <span className="dash-badge-name">{badge.displayName}</span>
    </div>
  )
}

export function ProfileScreen({ profile, onLogout }: Props) {
  const [memberSince, setMemberSince] = useState('')
  const initials = profile.username.slice(0, 2).toUpperCase()
  const badges = profile.badges ?? []
  const activeBadge = profile.activeBadge?.displayName ? profile.activeBadge : null

  useEffect(() => {
    setMemberSince(
      new Date(ensureFirstLogin()).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    )
  }, [])

  return (
    <div className="dash-page dash-profile">
      <header className="dash-profile-hero">
        {profile.avatarUrl ? (
          <img className="dash-profile-avatar" src={profile.avatarUrl} alt="" />
        ) : (
          <div className="dash-profile-avatar dash-profile-avatar-fallback">{initials}</div>
        )}
        <div className="dash-profile-identity">
          <div className="dash-profile-name-row">
            <h1>{profile.username}</h1>
            {profile.isPremium && <span className="dash-pill dash-pill-premium">Premium</span>}
            {activeBadge && (
              <span className="dash-badge-active-pill" title={activeBadge.displayName}>
                <BadgeIcon icon={activeBadge.icon} className="dash-badge-active-img" />
                {activeBadge.displayName}
              </span>
            )}
          </div>
          <p className="dash-profile-solved">{profile.solved.toLocaleString('en-US')} solved</p>
          <p>Member since {memberSince}</p>
        </div>
      </header>

      <div className="dash-profile-body">
        <div className="dash-profile-grid">
          <section className="dash-panel">
            <span className="dash-section-label">Solves</span>
            <div className="dash-resolution">
              <Donut easy={profile.solvedEasy} medium={profile.solvedMedium} hard={profile.solvedHard} />
              <ul className="dash-resolution-legend">
                <li>
                  <span className="dash-diff-dot tone-easy" /> Easy <strong>{profile.solvedEasy}</strong>
                </li>
                <li>
                  <span className="dash-diff-dot tone-medium" /> Medium <strong>{profile.solvedMedium}</strong>
                </li>
                <li>
                  <span className="dash-diff-dot tone-hard" /> Hard <strong>{profile.solvedHard}</strong>
                </li>
                <li>
                  <span className="dash-diff-dot tone-ok" /> Total <strong>{profile.solved}</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="dash-panel">
            <span className="dash-section-label">Account</span>
            <dl className="dash-kv">
              <div>
                <dt>Username</dt>
                <dd>{profile.username}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{profile.isPremium ? 'Premium' : 'Free'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className="dash-kv-active">
                  <span className="dash-status-dot tone-ok" /> Active
                </dd>
              </div>
            </dl>
            <div className="dash-profile-links">
              <a
                className="dash-link-btn"
                href={`https://leetcode.com/u/${profile.username}/`}
                target="_blank"
                rel="noreferrer"
              >
                Open on LeetCode →
              </a>
              <button type="button" className="dash-link-btn dash-link-danger" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>

        <section className="dash-panel">
          <span className="dash-section-label">Badges</span>
          {badges.length === 0 ? (
            <p className="dash-badges-empty">No badges earned yet.</p>
          ) : (
            <div className="dash-badges-grid">
              {badges.map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  active={activeBadge?.id === badge.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="dash-disclaimer">Unofficial client — data via LeetCode API</p>
    </div>
  )
}
