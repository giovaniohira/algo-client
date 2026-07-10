/** Parse LeetCode submissionCalendar JSON into ISO date → count. */
export function parseSubmissionCalendar(raw: string): Record<string, number> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, number>
    const byDate: Record<string, number> = {}
    for (const [ts, count] of Object.entries(parsed)) {
      const key = new Date(Number(ts) * 1000).toISOString().slice(0, 10)
      byDate[key] = (byDate[key] ?? 0) + count
    }
    return byDate
  } catch {
    return {}
  }
}

/** Last 52 weeks × 7 days, column-major (week columns). */
export function submissionCalendarHeatmap(raw: string): number[][] {
  const map = parseSubmissionCalendar(raw)
  const weeks: number[][] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 52 * 7 + 1)

  for (let w = 0; w < 52; w++) {
    const col: number[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      if (day > today) {
        col.push(0)
        continue
      }
      col.push(map[day.toISOString().slice(0, 10)] ?? 0)
    }
    weeks.push(col)
  }
  return weeks
}
