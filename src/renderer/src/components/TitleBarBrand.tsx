import { LogoMark } from './LogoMark'

interface Props {
  compact?: boolean
}

export function TitleBarBrand({ compact }: Props) {
  return (
    <div className="titlebar-brand">
      <LogoMark size={compact ? 18 : 22} className="brand-mark" />
      {!compact && <span className="brand-name">Algo Client</span>}
    </div>
  )
}
