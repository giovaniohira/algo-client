interface Props {
  size?: number
  className?: string
}

export function LogoMark({ size = 24, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="#FFA116" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="50" y1="18" x2="28" y2="48" />
        <line x1="50" y1="18" x2="72" y2="48" />
        <line x1="28" y1="48" x2="72" y2="48" />
        <line x1="28" y1="48" x2="18" y2="82" />
        <line x1="28" y1="48" x2="38" y2="82" />
        <line x1="72" y1="48" x2="62" y2="82" />
        <line x1="72" y1="48" x2="82" y2="82" />
      </g>
      <g fill="#FFA116">
        <circle cx="50" cy="18" r="5.5" />
        <circle cx="28" cy="48" r="5.5" />
        <circle cx="72" cy="48" r="5.5" />
        <circle cx="18" cy="82" r="5.5" />
        <circle cx="38" cy="82" r="5.5" />
        <circle cx="62" cy="82" r="5.5" />
        <circle cx="82" cy="82" r="5.5" />
      </g>
    </svg>
  )
}
