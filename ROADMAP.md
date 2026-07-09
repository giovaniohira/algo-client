# Roadmap — Algo Client

What still needs work to become a best-in-class unofficial LeetCode desktop client.

## Shipped recently

| Item | Status |
|------|--------|
| **Distribution** | `electron-builder` — Windows `.exe` via GitHub Releases |
| **Output panel** | Persistent run/submit results with testcase diff |
| **Custom test input** | Run against arbitrary input |
| **Code persistence** | Per-problem drafts in localStorage |
| **Prev/next navigation** | Keyboard and UI controls between problems |
| **Catalog auto-sync** | Syncs on first launch or when stale |
| **CI / Release pipeline** | GitHub Actions for checks and tagged releases |

## Core (remaining)

| Item | Current state |
|------|---------------|
| **Expired session UX** | Generic errors — no automatic redirect back to login |
| **First-run onboarding** | Catalog syncs automatically but no guided tour |

## UX / polish

| Item | Current state |
|------|---------------|
| **Premium filter stubs** | ProblemPicker has Frequency, Companies, Contest, etc. locked without implementation |
| **Status sync** | `syncProblemStatuses()` needs network + auth; offline catalog keeps stale status |
| **Settings** | No settings page (font, theme, shortcuts) |
| **Keyboard shortcuts** | Partial — prev/next exist; no Ctrl+Enter submit |
| **About / legal** | Disclaimer on login — no permanent in-app About section |
| **macOS / Linux** | Custom title bar is Windows-focused |

## Product / reliability

| Item | Current state |
|------|---------------|
| **Tests** | Adapter self-check only — no integration or UI tests |
| **Auto-update** | Not implemented (`latest.yml` generated but no updater wired) |
| **Rate-limit feedback** | Submit throttle exists but no visible "please wait" UX |
| **Premium problems** | `isPaidOnly` in catalog; minimal UX for locked content |
| **Discussions / editorial** | Solutions tab shows community submissions only |
| **Contests / daily challenge** | Not implemented |
| **Profile / stats** | Header shows ranking and solved count; no profile page |

## Suggested priority

1. Session expiry → auto re-login flow
2. Settings page (theme, font size, shortcuts)
3. Auto-update via `electron-updater`
4. macOS / Linux release artifacts in CI
