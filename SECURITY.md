# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability

If you discover a security issue, **please do not open a public GitHub issue**.

Instead, report it privately:

1. Go to [GitHub Security Advisories](https://github.com/giovaniohira/algo-client/security/advisories/new) and create a **private vulnerability report**, or
2. Email the maintainer via the contact on their [GitHub profile](https://github.com/giovaniohira)

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within **7 days**. If the issue is confirmed, we will work on a fix and coordinate disclosure.

## Scope

In scope:

- Authentication and session handling in the Electron app
- IPC bridge between renderer and main process
- Credential storage (safeStorage / keychain)
- Supply chain issues in dependencies

Out of scope:

- Vulnerabilities in LeetCode's own platform or API
- Social engineering attacks against LeetCode accounts
- Issues requiring physical access to an unlocked machine

## Safe usage

- This is an **unofficial** client — use at your own risk
- Only download installers from [official GitHub Releases](https://github.com/giovaniohira/algo-client/releases)
- Verify the publisher once code signing is enabled (see [CONTRIBUTING.md](CONTRIBUTING.md))
