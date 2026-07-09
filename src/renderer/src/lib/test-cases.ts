/** Format one judge/run input argument for LeetCode-style display. */
function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return JSON.stringify(arg)
  return JSON.stringify(arg)
}

/** LeetCode JSON-per-line: each line is `[arg1, arg2, ...]`. */
function tryJsonLines(lines: string[], paramCount: number): string[] | null {
  const rows: unknown[][] = []
  for (const line of lines) {
    try {
      const v = JSON.parse(line) as unknown
      if (!Array.isArray(v)) return null
      rows.push(v)
    } catch {
      return null
    }
  }
  if (!rows.length) return null

  const arity = rows[0].length
  if (arity === 0) return null
  if (!rows.every((r) => r.length === arity)) return null

  if (paramCount > 0) {
    if (arity !== paramCount) return null
  } else if (rows.length === 1 && arity > 1) {
    // ponytail: `[2,7,11,15]` alone is one array arg, not arity-4 JSON-lines row
    return null
  }

  return rows.map((row) => row.map(formatArg).join('\n'))
}

/** Raw judge input: `paramCount` lines per case (`[2,7,11,15]` then `9`, …). */
function tryRawChunks(lines: string[], paramCount: number): string[] | null {
  if (paramCount <= 0 || lines.length < paramCount) return null
  const cases: string[] = []
  for (let i = 0; i + paramCount <= lines.length; i += paramCount) {
    cases.push(lines.slice(i, i + paramCount).join('\n'))
  }
  return cases.length ? cases : null
}

/**
 * Parse LeetCode example test cases into run-ready input strings.
 * @param paramCount method arity (from starter code); 0 = best-effort
 */
export function parseExampleTestcases(raw: string, paramCount = 0): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)

  return (
    tryJsonLines(lines, paramCount) ??
    tryRawChunks(lines, paramCount) ??
    [trimmed]
  )
}

/** Extract method parameter names from a starter code snippet (excludes `self`). */
export function paramNamesFromSnippet(code: string): string[] {
  const py = code.match(/def\s+\w+\s*\(\s*self\s*,\s*([^)]*)\)/s)?.[1]
  if (py) {
    return py
      .split(',')
      .map((p) => p.trim().split(/[=:]/)[0].trim())
      .filter(Boolean)
  }

  const java = code.match(/(?:public|private|protected)[^{;]*\(\s*([^)]*)\)/s)?.[1]
  if (java) {
    const names = java
      .split(',')
      .map((p) => p.trim().split(/\s+/).pop()?.replace(/[[\]]/g, '') ?? '')
      .filter((n) => n && n !== 'self')
    if (names.length) return names
  }

  const sig =
    code.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?function)\s*\(\s*([^)]*)\)/)?.[1] ??
    code.match(/\(\s*([^)]*)\)\s*(?:->|:)\s*/)?.[1]
  if (!sig) return []

  return sig
    .split(',')
    .map((p) => p.trim().split(/[=:]/)[0].replace(/\?$/, '').trim())
    .filter((n) => n && n !== 'self')
}

export function linesToFields(lines: string[], paramNames: string[]): Array<{ name: string; value: string }> {
  if (paramNames.length > 0) {
    return paramNames.map((name, i) => ({ name, value: lines[i] ?? '' }))
  }
  return lines.map((value, i) => ({ name: `arg${i + 1}`, value }))
}

export function fieldsToInput(fields: Array<{ value: string }>): string {
  return fields.map((f) => f.value).join('\n')
}

if (import.meta.hot == null && typeof process !== 'undefined' && process.argv[1]?.includes('test-cases')) {
  const jsonCases = parseExampleTestcases('[[2,7,11,15],9]\n[[3,2,4],6]', 2)
  console.assert(jsonCases.length === 2, 'json-lines: two cases')
  console.assert(jsonCases[0] === '[2,7,11,15]\n9', 'json-lines: case 1')

  const rawAll =
    '[2,7,11,15]\n9\n[3,2,4]\n6\n[3,3]\n6'
  const rawCases = parseExampleTestcases(rawAll, 2)
  console.assert(rawCases.length === 3, 'raw: three cases')
  console.assert(rawCases[0] === '[2,7,11,15]\n9', 'raw: case 1')

  const sample = parseExampleTestcases('[2,7,11,15]\n9', 2)
  console.assert(sample.length === 1 && sample[0] === '[2,7,11,15]\n9', 'sample single case')

  const names = paramNamesFromSnippet('class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:')
  console.assert(names.join(',') === 'nums,target', 'param names')

  const fields = linesToFields(['[2,7,11,15]', '9'], names)
  console.assert(fields[0].name === 'nums' && fields[0].value === '[2,7,11,15]', 'field mapping')

  console.log('test-cases self-check ok')
}
