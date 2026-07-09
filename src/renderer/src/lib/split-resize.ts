import { useCallback, useEffect, useRef, useState } from 'react'

function readStored(key: string | undefined, fallback: number): number {
  if (!key) return fallback
  try {
    const v = parseInt(localStorage.getItem(key) ?? '', 10)
    return Number.isFinite(v) ? v : fallback
  } catch {
    return fallback
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

type Axis = 'horizontal' | 'vertical'

export function useSplitResize(
  containerRef: React.RefObject<HTMLElement | null>,
  axis: Axis,
  opts: {
    initial: number
    min: number
    maxRatio?: number
    storageKey?: string
    /** For vertical sidebar: distance from container left. For output: height from container bottom. */
    measure: (rect: DOMRect, clientX: number, clientY: number) => number
  }
) {
  const [size, setSize] = useState(() => readStored(opts.storageKey, opts.initial))
  const sizeRef = useRef(size)
  const dragging = useRef(false)
  sizeRef.current = size

  const maxFor = useCallback(
    (rect: DOMRect) => {
      const cap = opts.maxRatio != null ? rect[axis === 'vertical' ? 'width' : 'height'] * opts.maxRatio : Infinity
      return cap
    },
    [axis, opts.maxRatio]
  )

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      dragging.current = true
      document.body.style.cursor = axis === 'vertical' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [axis]
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next = clamp(opts.measure(rect, e.clientX, e.clientY), opts.min, maxFor(rect))
      setSize(next)
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (opts.storageKey) localStorage.setItem(opts.storageKey, String(sizeRef.current))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [containerRef, maxFor, opts])

  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSize((s) => clamp(s, opts.min, maxFor(rect)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [containerRef, maxFor, opts.min])

  return { size, setSize, startDrag, dragging }
}
