import type { ReactNode } from 'react'
import { WindowControls } from './WindowControls'

interface Props {
  children?: ReactNode
  minimal?: boolean
}

export function TitleBar({ children, minimal }: Props) {
  return (
    <header className={`titlebar${minimal ? ' titlebar-minimal' : ''}`}>
      <div className="titlebar-content">{children}</div>
      <WindowControls />
    </header>
  )
}
