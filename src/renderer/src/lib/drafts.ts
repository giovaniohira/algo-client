import { touchDraft } from './recent'

const PREFIX = 'algo-draft:'

export function draftKey(slug: string, lang: string): string {
  return `${PREFIX}${slug}:${lang}`
}

export function loadDraft(slug: string, lang: string): string | null {
  try {
    return localStorage.getItem(draftKey(slug, lang))
  } catch {
    return null
  }
}

export function saveDraft(slug: string, lang: string, code: string): void {
  try {
    localStorage.setItem(draftKey(slug, lang), code)
    touchDraft(slug, lang)
  } catch {
    // ponytail: quota exceeded — ignore
  }
}
