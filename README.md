<div align="center">

# Algo Client

**Desktop LeetCode client — fast, focused, offline-friendly browsing.**

[![CI](https://github.com/giovaniohira/algo-client/actions/workflows/ci.yml/badge.svg)](https://github.com/giovaniohira/algo-client/actions/workflows/ci.yml)
[![Release](https://github.com/giovaniohira/algo-client/actions/workflows/release.yml/badge.svg)](https://github.com/giovaniohira/algo-client/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)

[Download latest release](https://github.com/giovaniohira/algo-client/releases/latest) · [Report a bug](https://github.com/giovaniohira/algo-client/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/giovaniohira/algo-client/issues/new?template=feature_request.yml)

</div>

---

> **Disclaimer** — Algo Client is an **unofficial** project. It is not affiliated with, endorsed by, or connected to LeetCode. Use at your own risk and respect LeetCode's terms of service.

## Why Algo Client?

LeetCode's web UI is great, but a native desktop shell gives you a calmer workspace: persistent drafts, a proper output panel, resizable panes, and a problem catalog that syncs locally so browsing stays snappy even on slow connections.

| | Web | Algo Client |
|---|:---:|:---:|
| Monaco editor | ✓ | ✓ |
| Run / Submit | ✓ | ✓ |
| Local problem index | — | ✓ |
| Per-problem draft persistence | — | ✓ |
| Structured output panel | partial | ✓ |
| Custom test input | ✓ | ✓ |
| Native window + zoom | — | ✓ |

## Features

- **Sign in** with your LeetCode account via embedded browser (session stored securely with OS keychain when available)
- **Browse** 3 000+ problems with filters, tags, and difficulty — backed by a local catalog
- **Solve** with Monaco (Python, JavaScript, TypeScript, Java, C++, Go, Rust)
- **Run & Submit** against LeetCode's remote judge with testcase diff in the output panel
- **Drafts** auto-save per problem across sessions
- **Prev / Next** navigation between problems in the current list
- **Auto-sync** catalog on first launch or when stale

## Download

Pre-built Windows installers are published on every tagged release:

👉 **[Latest release → Windows `.exe`](https://github.com/giovaniohira/algo-client/releases/latest)**

| Platform | Status |
|----------|--------|
| Windows (NSIS installer) | ✅ Automated via GitHub Actions |
| macOS (`.dmg`) | 🚧 Build locally with `npm run dist` |
| Linux (AppImage) | 🚧 Build locally with `npm run dist` |

## Screenshots

<!-- Add screenshots after first public release -->
_Coming soon — grab a screenshot and open a PR!_

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/giovaniohira/algo-client.git
cd algo-client
npm install
npm run sync-problems   # fetch problem metadata (~2 min)
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Electron in development mode |
| `npm run build` | Production build (main + preload + renderer) |
| `npm run dist:win` | Build Windows installer |
| `npm run sync-problems` | Sync local problem catalog from LeetCode |
| `npm run check` | Adapter self-check against live API |
| `npm run preview` | Preview production build |

### Project layout

```
src/
├── main/          # Electron main process (auth, IPC, platform adapter)
├── preload/       # Context bridge API
└── renderer/      # React UI + Monaco
scripts/           # Catalog sync & health checks
data/problems/     # Local catalog (gitignored, generated)
```

## Releases

Pushing a version tag triggers the release pipeline:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions builds the Windows installer and attaches it to the release automatically.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned improvements and known gaps.

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feat/my-idea`)
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/) style (`feat:`, `fix:`, `chore:`)
4. Open a PR against `main`

Bug reports and feature requests are welcome via GitHub Issues.

## Tech stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React 19](https://react.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [leetcode-query](https://www.npmjs.com/package/leetcode-query) for API access

## License

[MIT](LICENSE) © Giovani Ohira
