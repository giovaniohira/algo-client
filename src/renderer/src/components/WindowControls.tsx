import { useEffect, useState } from 'react'
import { api, hasApi } from '../lib/api'

export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!hasApi()) return
    const client = api()
    void client.windowIsMaximized().then(setMaximized)
    return client.onWindowMaximized(setMaximized)
  }, [])

  if (!hasApi()) return null

  const client = api()

  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-btn"
        aria-label="Minimizar"
        onClick={() => void client.windowMinimize()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        type="button"
        className="window-btn"
        aria-label={maximized ? 'Restaurar' : 'Maximizar'}
        onClick={() => void client.windowToggleMaximize().then(setMaximized)}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M2 2h6v6H2V2zm1 1v4h4V3H3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="window-btn window-btn-close"
        aria-label="Fechar"
        onClick={() => void client.windowClose()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  )
}
