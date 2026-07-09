import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  delay?: number
  className?: string
}

export function FadeIn({ children, delay = 0, className = '' }: Props) {
  return (
    <div
      className={`motion-in${className ? ` ${className}` : ''}`}
      style={{ '--motion-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
