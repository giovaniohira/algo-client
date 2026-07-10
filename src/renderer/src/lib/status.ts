export function countProblemStatuses(statuses: Record<string, string | null>): {
  solved: number
  attempted: number
  todo: number
} {
  let solved = 0
  let attempted = 0
  let todo = 0
  for (const s of Object.values(statuses)) {
    if (s === 'ac') solved++
    else if (s === 'notac') attempted++
    else todo++
  }
  return { solved, attempted, todo }
}
