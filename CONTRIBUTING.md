# Contributing to Algo Client

Thanks for your interest in contributing! This project is a community-driven, unofficial LeetCode desktop client.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md)
- Check [open issues](https://github.com/giovaniohira/algo-client/issues) and the [roadmap](ROADMAP.md) to avoid duplicate work
- Remember: this project is **not** affiliated with LeetCode

## Development setup

```bash
git clone https://github.com/giovaniohira/algo-client.git
cd algo-client
npm install
npm run sync-problems
npm run dev
```

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run the app in development |
| `npm run build` | Production build |
| `npm run check` | Adapter self-check against live API |
| `npm run dist:win` | Build unsigned Windows installer locally |

## Pull request workflow

1. **Fork** the repository
2. **Branch** from `main` — use prefixes like `feat/`, `fix/`, `chore/`
3. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(renderer): add keyboard shortcut for submit`
   - `fix(main): handle expired session on submit`
   - `chore(ci): bump node version`
4. **Test** locally — at minimum `npm run build` and `npm run check`
5. **Open a PR** against `main` with a clear description and test plan

Keep PRs focused. Prefer small, reviewable changes over large refactors unless discussed first.

## Code style

- Match existing patterns in the file you're editing
- TypeScript strictness — no `any` unless unavoidable
- Lazy over clever: smallest diff that fixes the root cause
- Comments only for non-obvious logic

## Project structure

```
src/main/       Electron main process — auth, IPC, platform adapter
src/preload/    Context bridge (typed API surface)
src/renderer/   React UI + Monaco editor
scripts/        Tooling (catalog sync, health checks)
```

## Reporting bugs

Use the [bug report template](https://github.com/giovaniohira/algo-client/issues/new?template=bug_report.yml). Include:

- OS and app version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or logs if available

## Security issues

**Do not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).

---

## Maintainer notes

### Windows code signing (removes SmartScreen warning)

Unsigned Windows installers trigger **Microsoft Defender SmartScreen** ("Unknown publisher"). The only real fix is **Authenticode code signing**.

#### Option A — EV certificate (immediate SmartScreen trust)

1. Purchase an **EV Code Signing** certificate (DigiCert, Sectigo, SSL.com, etc.)
2. Complete identity verification (requires hardware token / USB key)
3. Export the `.pfx` and add GitHub secrets:

| Secret | Value |
|--------|-------|
| `WIN_CSC_LINK` | Base64-encoded `.pfx` file |
| `WIN_CSC_KEY_PASSWORD` | Certificate password |

```powershell
# Encode pfx for GitHub secret (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx"))
```

4. Push a new tag — the release workflow signs automatically when secrets are set

#### Option B — OV certificate (cheaper, slower trust)

Same setup as above, but SmartScreen trust builds gradually as more users download signed builds. Can take weeks.

#### Option C — Azure Trusted Signing

Microsoft's cloud signing service. Works well in CI without a local USB token. See [Azure Trusted Signing docs](https://learn.microsoft.com/en-us/azure/trusted-signing/).

#### Local signed build

```powershell
$env:CSC_LINK = "C:\path\to\cert.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
npm run dist:win
```

Verify signature:

```powershell
Get-AuthenticodeSignature ".\release\Algo Client-0.1.0-setup.exe"
```

### Cutting a release

```bash
# Bump version in package.json first
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions builds, signs (if configured), and publishes the installer.
