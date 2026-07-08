# Algo Client

Unofficial desktop client for [LeetCode](https://leetcode.com).

> **Disclaimer:** This project is not affiliated with, endorsed by, or connected to LeetCode. Use at your own risk.

## Features

- Native desktop app (Electron)
- LeetCode login via embedded browser
- Browse and solve problems with Monaco editor
- Run and submit code against LeetCode's judge
- Local problem catalog sync (`npm run sync-problems`)

## Development

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run sync-problems` | Sync problem catalog locally |
| `npm run check` | Run adapter self-check |

## License

MIT
