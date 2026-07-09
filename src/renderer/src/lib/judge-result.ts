import type { JudgeResult } from '../../../preload/index.d'

export function judgeErrorDetail(result: JudgeResult | null | undefined): string | null {
  if (!result) return null
  return (
    result.fullCompileError ??
    result.compileError ??
    result.fullRuntimeError ??
    result.runtimeError ??
    null
  )
}

export function formatJudgeSummary(result: JudgeResult): string {
  const parts = [result.statusMsg]
  if (result.totalCorrect != null && result.totalTestcases != null) {
    parts.push(`${result.totalCorrect}/${result.totalTestcases} testes`)
  }
  if (result.statusRuntime) parts.push(result.statusRuntime)
  else if (result.runtimeMs != null) parts.push(`${result.runtimeMs} ms`)
  if (result.statusMemory) parts.push(result.statusMemory)
  else if (result.memoryKb != null) parts.push(`${(result.memoryKb / 1024).toFixed(1)} MB`)
  return parts.join(' — ')
}
