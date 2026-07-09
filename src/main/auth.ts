import { BrowserWindow, safeStorage, session } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const SESSION_FILE = 'account-session.bin'
const LOGIN_URL = 'https://leetcode.com/accounts/login/'
const PARTITION = 'persist:account'

export interface AccountSession {
  leetcodeSession: string
  csrfToken: string
  username?: string
}

function sessionPath(): string {
  return join(app.getPath('userData'), SESSION_FILE)
}

function encrypt(data: string): Buffer {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(data)
  }
  return Buffer.from(data, 'utf8')
}

function decrypt(buf: Buffer): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buf)
  }
  return buf.toString('utf8')
}

export function invalidateStoredSession(): void {
  const path = sessionPath()
  if (existsSync(path)) writeFileSync(path, '')
}

export function saveSession(sess: AccountSession): void {
  writeFileSync(sessionPath(), encrypt(JSON.stringify(sess)))
}

export function loadSession(): AccountSession | null {
  const path = sessionPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(decrypt(readFileSync(path))) as AccountSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  const path = sessionPath()
  if (existsSync(path)) writeFileSync(path, '')
  const ses = session.fromPartition(PARTITION)
  ses.clearStorageData()
}

async function readCookies(): Promise<AccountSession | null> {
  const ses = session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({ url: 'https://leetcode.com' })
  const leetcodeSession = cookies.find((c) => c.name === 'LEETCODE_SESSION')?.value
  const csrfToken = cookies.find((c) => c.name === 'csrftoken')?.value
  if (!leetcodeSession || !csrfToken) return null
  return { leetcodeSession, csrfToken }
}

async function verifySession(sess: AccountSession): Promise<boolean> {
  const res = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: `LEETCODE_SESSION=${sess.leetcodeSession}; csrftoken=${sess.csrfToken}`,
      'x-csrftoken': sess.csrfToken,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({
      query: 'query { userStatus { isSignedIn username } }'
    })
  })
  if (!res.ok) return false
  const body = (await res.json()) as {
    data?: { userStatus?: { isSignedIn?: boolean } }
  }
  return body.data?.userStatus?.isSignedIn === true
}

const LOGIN_WINDOW = { width: 420, height: 660, minWidth: 380, minHeight: 560 } as const

// ponytail: LeetCode login uses hashed CSS-module classes; attribute selectors survive deploys better than exact names.
const LOGIN_FOCUS_CSS = `
  [class*="sign-in-page"] > *:not([class*="sign-in-wrapper"]) {
    display: none !important;
  }

  nav, footer, [class*="announcement"], [class*="placeholder-top"], [class*="root__"] {
    display: none !important;
  }

  html, body, #app {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    min-height: 100% !important;
    overflow: hidden !important;
    background: #f5f5f5 !important;
  }

  [class*="sign-in-page"],
  [class*="sign-in-wrapper"],
  [class*="sign-in-section"],
  [class*="placeholder-bottom"] {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  [class*="sign-in-box"] {
    margin: 0 auto !important;
    width: calc(100% - 32px) !important;
    max-width: 400px !important;
    flex-shrink: 0 !important;
  }
`

const LOGIN_FOCUS_JS = String.raw`(() => {
  if (!window.__algoLoginFocus) {
    window.__algoLoginFocus = { installed: false, css: false }

    window.__algoLoginFocus.apply = () => {
      const box = document.querySelector('[class*="sign-in-box"]')
      if (!box) return false

      for (const el of document.querySelectorAll(
        'nav, footer, [class*="announcement"], [class*="placeholder-top"], [class*="root__"]'
      )) {
        el.style.setProperty('display', 'none', 'important')
      }

      const page = document.querySelector('[class*="sign-in-page"]')
      if (page) {
        for (const child of page.children) {
          if (!String(child.className).includes('sign-in-wrapper')) {
            child.style.setProperty('display', 'none', 'important')
          }
        }
      }

      const chain = [
        document.documentElement,
        document.body,
        document.getElementById('app'),
        page,
        ...document.querySelectorAll(
          '[class*="sign-in-wrapper"], [class*="sign-in-section"], [class*="placeholder-bottom"]'
        )
      ]

      for (const el of chain) {
        if (!el) continue
        el.style.setProperty('width', '100%', 'important')
        el.style.setProperty('max-width', '100%', 'important')
        el.style.setProperty('min-width', '0', 'important')
        el.style.setProperty('overflow-x', 'hidden', 'important')
        el.style.setProperty('margin', '0', 'important')
        el.style.setProperty('padding', '0', 'important')
      }

      for (const el of document.querySelectorAll(
        '[class*="sign-in-page"], [class*="sign-in-wrapper"], [class*="sign-in-section"], [class*="placeholder-bottom"]'
      )) {
        el.style.setProperty('display', 'flex', 'important')
        el.style.setProperty('align-items', 'center', 'important')
        el.style.setProperty('justify-content', 'center', 'important')
        el.style.setProperty('min-height', '100vh', 'important')
      }

      box.style.setProperty('margin', '0 auto', 'important')
      box.style.setProperty('width', 'calc(100% - 32px)', 'important')
      box.style.setProperty('max-width', '400px', 'important')

      document.documentElement.style.setProperty('overflow', 'hidden', 'important')
      document.body.style.setProperty('overflow', 'hidden', 'important')
      document.body.style.setProperty('background', '#f5f5f5', 'important')
      window.scrollTo(0, 0)

      const rect = box.getBoundingClientRect()
      const centered = Math.abs(rect.left - (window.innerWidth - rect.width) / 2) < 4
      const visible = rect.left >= -1 && rect.right <= window.innerWidth + 1
      return centered && visible
    }

    window.__algoLoginFocus.install = () => {
      if (window.__algoLoginFocus.installed) return
      window.__algoLoginFocus.installed = true
      window.__algoLoginFocus.apply()
      const obs = new MutationObserver(() => window.__algoLoginFocus.apply())
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      })
      let n = 0
      const timer = setInterval(() => {
        window.__algoLoginFocus.apply()
        if (++n >= 50) clearInterval(timer)
      }, 100)
    }
  }

  window.__algoLoginFocus.install()
  return window.__algoLoginFocus.apply()
})()`

async function focusLoginCard(win: BrowserWindow): Promise<boolean> {
  const contents = win.webContents as Electron.WebContents & { __algoLoginCss?: boolean }
  if (!contents.__algoLoginCss) {
    contents.__algoLoginCss = true
    await win.webContents.insertCSS(LOGIN_FOCUS_CSS)
  }
  try {
    return Boolean(await win.webContents.executeJavaScript(LOGIN_FOCUS_JS, true))
  } catch {
    return false
  }
}

async function revealLoginWindow(win: BrowserWindow): Promise<void> {
  for (let i = 0; i < 40; i++) {
    if (await focusLoginCard(win)) {
      win.show()
      return
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  win.show()
}

export async function openLoginWindow(): Promise<AccountSession> {
  return new Promise((resolve, reject) => {
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().at(0)

    const loginWin = new BrowserWindow({
      width: LOGIN_WINDOW.width,
      height: LOGIN_WINDOW.height,
      minWidth: LOGIN_WINDOW.minWidth,
      minHeight: LOGIN_WINDOW.minHeight,
      title: 'Sign in to LeetCode',
      show: false,
      center: true,
      autoHideMenuBar: true,
      backgroundColor: '#f5f5f5',
      parent: parent ?? undefined,
      modal: Boolean(parent),
      webPreferences: {
        partition: PARTITION,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    loginWin.removeMenu()
    loginWin.setMenuBarVisibility(false)

    const primeLoginView = (): void => {
      void focusLoginCard(loginWin)
    }
    loginWin.webContents.on('dom-ready', primeLoginView)
    loginWin.once('ready-to-show', () => void revealLoginWindow(loginWin))
    loginWin.webContents.on('did-finish-load', primeLoginView)

    let settled = false

    const tryCapture = async (): Promise<void> => {
      if (settled) return
      const sess = await readCookies()
      if (!sess) return
      if (!(await verifySession(sess))) return
      settled = true
      saveSession(sess)
      loginWin.close()
      resolve(sess)
    }

    loginWin.webContents.on('did-navigate', () => void tryCapture())
    loginWin.webContents.on('did-navigate-in-page', () => void tryCapture())
    loginWin.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new Error('Login cancelled'))
      }
    })

    loginWin.loadURL(LOGIN_URL)
  })
}

export async function getSession(): Promise<AccountSession | null> {
  const stored = loadSession()
  if (stored) return stored
  return readCookies()
}

export async function logout(): Promise<void> {
  clearSession()
}

export function storeUsername(username: string): void {
  const sess = loadSession()
  if (!sess) return
  saveSession({ ...sess, username })
}
