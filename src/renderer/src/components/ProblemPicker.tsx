import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { ProblemDetail, ProblemSummary } from '../../../../preload/index.d'

type ProblemStatus = 'todo' | 'attempted' | 'solved'
type FilterOp = 'is' | 'is_not'
type FilterKind =
  | 'status'
  | 'difficulty'
  | 'topics'
  | 'language'
  | 'frequency'
  | 'companies'
  | 'position'
  | 'position_level'
  | 'contest'
  | 'question_id'
  | 'acceptance'
  | 'last_submit'
  | 'published'
  | 'premium'
type MatchMode = 'all' | 'any'

interface FilterRow {
  id: string
  kind: FilterKind
  op: FilterOp
  value: string
}

interface FilterDef {
  kind: FilterKind
  label: string
  accent?: boolean
  premium?: boolean
}

interface Props {
  problem: ProblemDetail | null
  busy: boolean
  isPremium: boolean
  onSelect: (slug: string) => void
  children: (parts: { trigger: ReactNode; panel: ReactNode }) => ReactNode
}

const DEFAULT_FILTER_KINDS: FilterKind[] = ['status', 'difficulty', 'topics', 'language']

const ADD_FILTER_KINDS: FilterDef[] = [
  { kind: 'frequency', label: 'Frequency', accent: true, premium: true },
  { kind: 'companies', label: 'Companies', accent: true, premium: true },
  { kind: 'position', label: 'Position', accent: true, premium: true },
  { kind: 'position_level', label: 'Position Level', accent: true, premium: true },
  { kind: 'contest', label: 'Contest pt.', accent: true, premium: true },
  { kind: 'question_id', label: 'Question ID' },
  { kind: 'acceptance', label: 'Acceptance' },
  { kind: 'last_submit', label: 'Last Submit' },
  { kind: 'published', label: 'Published' },
  { kind: 'premium', label: 'Premium Cont.', premium: true }
]

const ALL_FILTER_DEFS: FilterDef[] = [
  { kind: 'status', label: 'Status' },
  { kind: 'difficulty', label: 'Difficulty' },
  { kind: 'topics', label: 'Topics' },
  { kind: 'language', label: 'Language' },
  ...ADD_FILTER_KINDS
]

const STATUS_OPTIONS: Array<{ value: ProblemStatus; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'solved', label: 'Solved' }
]

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', tone: 'easy' },
  { value: 'medium', label: 'Med.', tone: 'medium' },
  { value: 'hard', label: 'Hard', tone: 'hard' }
]

const LANGUAGE_OPTIONS = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python3', label: 'Python3' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'csharp', label: 'C#' }
]

const ACCEPTANCE_OPTIONS = [
  { value: 'lt30', label: '< 30%' },
  { value: '30-50', label: '30% – 50%' },
  { value: '50-70', label: '50% – 70%' },
  { value: 'gt70', label: '> 70%' }
]

const OP_OPTIONS = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' }
] as const

const MATCH_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' }
] as const

function defFor(kind: FilterKind): FilterDef {
  return ALL_FILTER_DEFS.find((d) => d.kind === kind) ?? { kind, label: kind }
}

function isPremiumFilter(def: FilterDef): boolean {
  return Boolean(def.premium)
}

function unlockLabel(def: FilterDef): string {
  return `Subscribe to unlock ${def.label.toLowerCase()}`
}

function defaultFilters(): FilterRow[] {
  return DEFAULT_FILTER_KINDS.map((kind) => ({ id: kind, kind, op: 'is', value: '' }))
}

function normStatus(status: string | null): ProblemStatus {
  if (status === 'ac') return 'solved'
  if (status === 'notac') return 'attempted'
  return 'todo'
}

function matchesAcceptance(acRate: number | null, bucket: string): boolean {
  if (acRate == null) return false
  switch (bucket) {
    case 'lt30':
      return acRate < 30
    case '30-50':
      return acRate >= 30 && acRate < 50
    case '50-70':
      return acRate >= 50 && acRate < 70
    case 'gt70':
      return acRate >= 70
    default:
      return false
  }
}

function optionsFor(kind: FilterKind, allTags: Array<{ name: string; slug: string }>) {
  switch (kind) {
    case 'status':
      return STATUS_OPTIONS
    case 'difficulty':
      return DIFFICULTY_OPTIONS
    case 'language':
      return LANGUAGE_OPTIONS
    case 'acceptance':
      return ACCEPTANCE_OPTIONS
    case 'topics':
      return allTags.map((t) => ({ value: t.slug, label: t.name }))
    default:
      return []
  }
}

function isSupported(kind: FilterKind): boolean {
  return ['status', 'difficulty', 'topics', 'language', 'question_id', 'acceptance'].includes(kind)
}

function matchesRow(
  p: ProblemSummary,
  row: FilterRow,
  attemptLangs: Record<string, string[]>
): boolean {
  if (!row.value) return true

  let matched = true
  switch (row.kind) {
    case 'status':
      matched = normStatus(p.status) === row.value
      break
    case 'difficulty':
      matched = p.difficulty.toLowerCase() === row.value
      break
    case 'topics':
      matched = p.tags.some((t) => t.slug === row.value)
      break
    case 'language':
      matched = attemptLangs[p.slug]?.includes(row.value) ?? false
      break
    case 'question_id':
      matched = p.id === row.value
      break
    case 'acceptance':
      matched = matchesAcceptance(p.acRate, row.value)
      break
    default:
      matched = true
  }

  return row.op === 'is_not' ? !matched : matched
}

function FilterKindIcon({ kind, accent }: { kind: FilterKind; accent?: boolean }) {
  const color = accent ? '#f59e0b' : 'currentColor'
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2 }

  switch (kind) {
    case 'status':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'difficulty':
      return (
        <svg {...props}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )
    case 'topics':
      return (
        <svg {...props}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )
    case 'language':
      return (
        <svg {...props}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'frequency':
      return (
        <svg {...props} fill={color} stroke="none">
          <path d="M12 2c1 4 4 6 4 10a4 4 0 0 1-8 0c0-4 3-6 4-10z" />
        </svg>
      )
    case 'companies':
      return (
        <svg {...props}>
          <rect x="4" y="8" width="16" height="12" rx="1" />
          <path d="M9 8V5a3 3 0 0 1 6 0v3" />
        </svg>
      )
    case 'position':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      )
    case 'position_level':
      return (
        <svg {...props}>
          <path d="M3 20h18M7 16l3-8 3 5 3-9 4 12" />
        </svg>
      )
    case 'contest':
      return (
        <svg {...props}>
          <path d="M8 21h8M12 17v4M7 4h10l1 4H6l1-4zM6 8h12v5a6 6 0 0 1-12 0V8z" />
        </svg>
      )
    case 'question_id':
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h10M4 18h6" />
        </svg>
      )
    case 'acceptance':
      return (
        <svg {...props}>
          <path d="M18 10h-4V6M6 14h4v4M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" />
        </svg>
      )
    case 'last_submit':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'published':
      return (
        <svg {...props}>
          <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4V5L7 9H5a2 2 0 0 0-2 2z" />
          <path d="M16 8a5 5 0 0 1 0 8" />
        </svg>
      )
    case 'premium':
      return (
        <svg {...props}>
          <path d="M2 20h20L19 9l-5 3-2-6-2 6-5-3-3 11z" />
        </svg>
      )
    default:
      return null
  }
}

function FilterChevron() {
  return (
    <svg className="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

type FloatingPlacement = 'below' | 'above' | 'right'

function FloatingMenu({
  anchorRef,
  open,
  placement = 'below',
  className,
  minWidth,
  children
}: {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  placement?: FloatingPlacement
  className?: string
  minWidth?: number
  children: ReactNode
}) {
  const [style, setStyle] = useState<CSSProperties>({})

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (placement === 'right') {
        setStyle({
          position: 'fixed',
          top: r.top,
          left: r.right + 8,
          zIndex: 200,
          minWidth: minWidth ?? 200
        })
        return
      }
      if (placement === 'above') {
        setStyle({
          position: 'fixed',
          top: r.top - 4,
          left: r.left,
          transform: 'translateY(-100%)',
          zIndex: 200,
          minWidth: minWidth ?? 200
        })
        return
      }
      setStyle({
        position: 'fixed',
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
        minWidth: minWidth ?? r.width,
        zIndex: 200
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, placement, minWidth])

  if (!open) return null
  return createPortal(
    <div className={`filter-floating ${className ?? ''}`.trim()} style={style}>
      {children}
    </div>,
    document.body
  )
}

function FilterValueDropdown({
  value,
  options,
  open,
  onToggle,
  onChange,
  disabled,
  variant = 'value'
}: {
  value: string
  options: Array<{ value: string; label: string; tone?: string }>
  open: boolean
  onToggle: () => void
  onChange: (value: string) => void
  disabled?: boolean
  variant?: 'value' | 'op' | 'match'
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((o) => o.value === value)
  const btnClass =
    variant === 'op'
      ? 'filter-select filter-select-op filter-select-btn'
      : variant === 'match'
        ? 'filter-select filter-match-btn filter-select-btn'
        : 'filter-select filter-select-value filter-select-btn'

  return (
    <div className="filter-value-wrap">
      <button
        ref={btnRef}
        type="button"
        className={btnClass}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className={selected?.tone ? `diff-tone ${selected.tone}` : 'filter-value-text'}>
          {selected?.label ?? ''}
        </span>
        <FilterChevron />
      </button>
      <FloatingMenu anchorRef={btnRef} open={open && !disabled} className="filter-dropdown">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`filter-dropdown-item${opt.tone ? ` diff-tone ${opt.tone}` : ''}${opt.value === value ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </FloatingMenu>
    </div>
  )
}

function TopicsFilterValue({
  label,
  open,
  onToggle,
  topicSearch,
  onTopicSearch,
  visibleTags,
  value,
  onSelect,
  onReset
}: {
  label: string
  open: boolean
  onToggle: () => void
  topicSearch: string
  onTopicSearch: (q: string) => void
  visibleTags: Array<{ name: string; slug: string }>
  value: string
  onSelect: (slug: string) => void
  onReset: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  return (
    <div className="filter-value-wrap">
      <button
        ref={btnRef}
        type="button"
        className="filter-select filter-select-value filter-select-btn"
        onClick={onToggle}
      >
        <span className="filter-value-text">{label}</span>
        <FilterChevron />
      </button>
      <FloatingMenu anchorRef={btnRef} open={open} placement="right" className="topics-picker" minWidth={320}>
        <div className="topics-picker-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="topics-picker-search"
            placeholder="search"
            value={topicSearch}
            onChange={(e) => onTopicSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="topics-chips">
          {visibleTags.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              className={`topic-chip${value === tag.slug ? ' active' : ''}`}
              onClick={() => onSelect(tag.slug)}
            >
              {tag.name}
            </button>
          ))}
        </div>
        <div className="topics-picker-footer">
          <button type="button" className="topics-picker-reset" onClick={onReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Reset
          </button>
        </div>
      </FloatingMenu>
    </div>
  )
}

export function ProblemPicker({ problem, busy, isPremium, onSelect, children }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<ProblemSummary[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [attemptLangs, setAttemptLangs] = useState<Record<string, string[]>>({})
  const [tagOptions, setTagOptions] = useState<Array<{ name: string; slug: string }>>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [topicsPickerId, setTopicsPickerId] = useState<string | null>(null)
  const [openSelectId, setOpenSelectId] = useState<string | null>(null)
  const [openOpId, setOpenOpId] = useState<string | null>(null)
  const [matchMenuOpen, setMatchMenuOpen] = useState(false)
  const [topicSearch, setTopicSearch] = useState('')
  const [matchMode, setMatchMode] = useState<MatchMode>('all')
  const [filters, setFilters] = useState<FilterRow[]>(defaultFilters)
  const panelRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()

  const loadCatalog = useCallback(async () => {
    if (catalog.length > 0) return catalog
    setLoadingCatalog(true)
    try {
      const data = await window.algoClient.listProblems()
      const questions = data.questions ?? []
      setCatalog(questions)
      return questions
    } catch {
      return []
    } finally {
      setLoadingCatalog(false)
    }
  }, [catalog.length])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    if (catalog.length === 0) return
    void window.algoClient
      .syncProblemStatuses()
      .then((statuses) => {
        if (!statuses || Object.keys(statuses).length === 0) return
        setCatalog((prev) =>
          prev.map((p) => ({
            ...p,
            status: statuses[p.slug] ?? p.status
          }))
        )
      })
      .catch(() => {})
  }, [catalog.length])

  useEffect(() => {
    void window.algoClient.attemptLanguages().then(setAttemptLangs).catch(() => setAttemptLangs({}))
    void window.algoClient.tagOptions().then(setTagOptions).catch(() => setTagOptions([]))
  }, [])

  const closeDropdowns = useCallback(() => {
    setOpenSelectId(null)
    setOpenOpId(null)
    setMatchMenuOpen(false)
    setTopicsPickerId(null)
    setAddMenuOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (topicsPickerId || openSelectId || openOpId || matchMenuOpen || addMenuOpen) {
          closeDropdowns()
        } else if (filtersOpen) setFiltersOpen(false)
        else setOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.filter-floating')) return
      const isToggle = el.closest('.filter-select-btn, .filter-add, .filter-match-btn')
      if (panelRef.current?.contains(el) || filterRef.current?.contains(el)) {
        if (!isToggle) closeDropdowns()
        return
      }
      setOpen(false)
      setFiltersOpen(false)
      closeDropdowns()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open, filtersOpen, topicsPickerId, addMenuOpen, openSelectId, openOpId, matchMenuOpen, closeDropdowns])

  const allTags = useMemo(() => {
    const seen = new Map<string, { name: string; slug: string }>()
    for (const t of tagOptions) seen.set(t.slug, t)
    for (const p of catalog) {
      for (const tag of p.tags ?? []) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag)
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog, tagOptions])

  const visibleTags = useMemo(() => {
    const q = topicSearch.trim().toLowerCase()
    if (!q) return allTags
    return allTags.filter((t) => t.name.toLowerCase().includes(q))
  }, [allTags, topicSearch])

  const activeFilters = useMemo(() => filters.filter((f) => f.value), [filters])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((p) => {
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.includes(q) ||
        p.slug.toLowerCase().includes(q)

      if (!matchesQuery) return false
      if (activeFilters.length === 0) return true

      const checks = activeFilters.map((row) => matchesRow(p, row, attemptLangs))
      return matchMode === 'all' ? checks.every(Boolean) : checks.some(Boolean)
    })
  }, [catalog, query, activeFilters, matchMode, attemptLangs])

  const availableAddKinds = useMemo(
    () => ADD_FILTER_KINDS.filter((d) => !filters.some((f) => f.kind === d.kind)),
    [filters]
  )

  const openList = () => setOpen(true)

  const selectProblem = (slug: string) => {
    onSelect(slug)
    setOpen(false)
    setQuery('')
    setFiltersOpen(false)
    closeDropdowns()
  }

  const resetFilters = () => {
    setFilters(defaultFilters())
    setMatchMode('all')
    closeDropdowns()
  }

  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    setFilters((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const addFilter = (kind: FilterKind) => {
    const def = defFor(kind)
    if (isPremiumFilter(def) && !isPremium) return
    setFilters((rows) => [...rows, { id: `${kind}-${Date.now()}`, kind, op: 'is', value: '' }])
    setAddMenuOpen(false)
  }

  const removeFilter = (id: string) => {
    setFilters((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }

  const labelForValue = (row: FilterRow) => {
    const opts = optionsFor(row.kind, allTags)
    return opts.find((o) => o.value === row.value)?.label ?? ''
  }

  const renderValueControl = (row: FilterRow) => {
    const def = defFor(row.kind)
    const locked = isPremiumFilter(def) && !isPremium

    if (!isSupported(row.kind) || locked) {
      return (
        <button type="button" className="filter-select filter-select-value filter-select-btn" disabled>
          <span className="filter-value-text" />
          <FilterChevron />
        </button>
      )
    }

    if (row.kind === 'topics') {
      return (
        <TopicsFilterValue
          label={labelForValue(row)}
          open={topicsPickerId === row.id}
          onToggle={() => {
            setTopicsPickerId((id) => (id === row.id ? null : row.id))
            setOpenSelectId(null)
            setOpenOpId(null)
            setMatchMenuOpen(false)
            setTopicSearch('')
            setAddMenuOpen(false)
          }}
          topicSearch={topicSearch}
          onTopicSearch={setTopicSearch}
          visibleTags={visibleTags}
          value={row.value}
          onSelect={(slug) => {
            updateFilter(row.id, { value: slug })
            setTopicsPickerId(null)
            setTopicSearch('')
          }}
          onReset={() => {
            updateFilter(row.id, { value: '' })
            setTopicSearch('')
          }}
        />
      )
    }

    if (row.kind === 'question_id') {
      return (
        <input
          className="filter-select filter-select-value filter-input"
          placeholder=""
          value={row.value}
          onChange={(e) => updateFilter(row.id, { value: e.target.value })}
        />
      )
    }

    const opts =
      row.kind === 'difficulty'
        ? DIFFICULTY_OPTIONS
        : row.kind === 'language'
          ? LANGUAGE_OPTIONS
          : optionsFor(row.kind, allTags)

    return (
      <FilterValueDropdown
        value={row.value}
        options={opts}
        open={openSelectId === row.id}
        onToggle={() => {
          setOpenSelectId((id) => (id === row.id ? null : row.id))
          setTopicsPickerId(null)
          setOpenOpId(null)
          setMatchMenuOpen(false)
          setAddMenuOpen(false)
        }}
        onChange={(value) => {
          updateFilter(row.id, { value })
          setOpenSelectId(null)
        }}
      />
    )
  }

  return children({
    trigger: (
      <button
        className={`problem-list-btn${open ? ' active' : ''}`}
        onClick={openList}
        disabled={busy}
        aria-label="Lista de problemas"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        <span>Problem List</span>
      </button>
    ),
    panel: open ? (
      <>
        <div className="problem-list-backdrop" />
        <div className="problem-list-panel" ref={panelRef}>
          <div className="problem-list-header">
            <div className="search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                className="search-input"
                placeholder="Search questions"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className={`icon-btn${filtersOpen ? ' active' : ''}`}
              onClick={() => {
                setFiltersOpen((v) => !v)
                closeDropdowns()
              }}
              aria-label="Filtros"
              title="Filtros"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
            </button>
          </div>

          <ul className="search-results" aria-labelledby={uid}>
            <span id={uid} className="sr-only">
              Lista de problemas
            </span>
            {loadingCatalog && <li className="search-empty">Carregando...</li>}
            {!loadingCatalog && filtered.length === 0 && (
              <li className="search-empty">Nenhum resultado</li>
            )}
            {filtered.map((q) => {
              const status = normStatus(q.status)
              return (
                <li key={q.slug}>
                  <button
                    className={`search-item${q.slug === problem?.slug ? ' active' : ''}`}
                    onClick={() => selectProblem(q.slug)}
                  >
                    <span className="search-item-title">
                      <span className="search-item-id">{q.id}.</span> {q.title}
                    </span>
                    <span className="search-item-meta">
                      {status === 'solved' && (
                        <svg
                          className="status-icon solved"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                      {status === 'attempted' && <span className="status-icon attempted" />}
                      <span className={`diff-dot ${q.difficulty.toLowerCase()}`} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {filtersOpen && (
          <div className="filter-panel" ref={filterRef}>
            <div className="filter-panel-header">
              <span>Match</span>
              <FilterValueDropdown
                value={matchMode}
                options={[...MATCH_OPTIONS]}
                open={matchMenuOpen}
                onToggle={() => {
                  setMatchMenuOpen((v) => !v)
                  setOpenSelectId(null)
                  setOpenOpId(null)
                  setTopicsPickerId(null)
                  setAddMenuOpen(false)
                }}
                onChange={(value) => {
                  setMatchMode(value as MatchMode)
                  setMatchMenuOpen(false)
                }}
                variant="match"
              />
              <span>of the following filters:</span>
            </div>

            <div className="filter-rows">
              {filters.map((row) => {
                const def = defFor(row.kind)
                const locked = isPremiumFilter(def) && !isPremium
                return (
                  <div className={`filter-row${locked ? ' locked' : ''}`} key={row.id}>
                    <div className={`filter-kind${def.accent ? ' accent' : ''}${locked ? ' locked' : ''}`}>
                      <FilterKindIcon kind={row.kind} accent={def.accent && !locked} />
                      <span>{def.label}</span>
                    </div>
                    <FilterValueDropdown
                      value={row.op}
                      options={[...OP_OPTIONS]}
                      open={openOpId === row.id}
                      onToggle={() => {
                        setOpenOpId((id) => (id === row.id ? null : row.id))
                        setOpenSelectId(null)
                        setTopicsPickerId(null)
                        setMatchMenuOpen(false)
                        setAddMenuOpen(false)
                      }}
                      onChange={(value) => {
                        updateFilter(row.id, { op: value as FilterOp })
                        setOpenOpId(null)
                      }}
                      variant="op"
                    />
                    {renderValueControl(row)}
                    <button
                      type="button"
                      className="filter-remove"
                      onClick={() => removeFilter(row.id)}
                      aria-label="Remover filtro"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="filter-panel-footer">
              <div className="filter-add-wrap" ref={addMenuRef}>
                <button
                  ref={addBtnRef}
                  type="button"
                  className="filter-add"
                  onClick={() => {
                    setAddMenuOpen((v) => !v)
                    setOpenSelectId(null)
                    setOpenOpId(null)
                    setTopicsPickerId(null)
                    setMatchMenuOpen(false)
                  }}
                  aria-label="Adicionar filtro"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <FloatingMenu
                  anchorRef={addBtnRef}
                  open={addMenuOpen && availableAddKinds.length > 0}
                  placement="above"
                  className="filter-add-menu"
                  minWidth={210}
                >
                  {availableAddKinds.map((def) => {
                    const locked = isPremiumFilter(def) && !isPremium
                    return (
                      <div key={def.kind} className="filter-add-item-wrap">
                        {locked && <div className="premium-tooltip">{unlockLabel(def)}</div>}
                        <button
                          type="button"
                          className={`filter-add-item${locked ? ' locked' : ''}`}
                          onClick={() => addFilter(def.kind)}
                          disabled={locked}
                        >
                          <FilterKindIcon kind={def.kind} accent={def.accent && !locked} />
                          <span>{def.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </FloatingMenu>
              </div>
              <button type="button" className="filter-reset" onClick={resetFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        )}
      </>
    ) : null
  })
}
