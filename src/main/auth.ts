import { BrowserWindow, safeStorage, session } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getDb, insertEvent } from './db'

const SESSION_FILE = 'leetcode-session.bin'
const LOGIN_URL = 'https://leetcode.com/accounts/login/'
const PARTITION = 'persist:leetcode'

export interface LeetCodeSession {
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

export function saveSession(sess: LeetCodeSession): void {
  writeFileSync(sessionPath(), encrypt(JSON.stringify(sess)))
}

export function loadSession(): LeetCodeSession | null {
  const path = sessionPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(decrypt(readFileSync(path))) as LeetCodeSession
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

async function readCookies(): Promise<LeetCodeSession | null> {
  const ses = session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({ url: 'https://leetcode.com' })
  const leetcodeSession = cookies.find((c) => c.name === 'LEETCODE_SESSION')?.value
  const csrfToken = cookies.find((c) => c.name === 'csrftoken')?.value
  if (!leetcodeSession || !csrfToken) return null
  return { leetcodeSession, csrfToken }
}

async function verifySession(sess: LeetCodeSession): Promise<boolean> {
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

export async function openLoginWindow(): Promise<LeetCodeSession> {
  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'Login LeetCode',
      webPreferences: {
        partition: PARTITION,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    let settled = false

    const tryCapture = async (): Promise<void> => {
      if (settled) return
      const sess = await readCookies()
      if (!sess) return
      if (!(await verifySession(sess))) return
      settled = true
      saveSession(sess)
      insertEvent('auth_success', {})
      loginWin.close()
      resolve(sess)
    }

    loginWin.webContents.on('did-navigate', () => void tryCapture())
    loginWin.webContents.on('did-navigate-in-page', () => void tryCapture())
    loginWin.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new Error('Login cancelado'))
      }
    })

    loginWin.loadURL(LOGIN_URL)
  })
}

export async function getSession(): Promise<LeetCodeSession | null> {
  const stored = loadSession()
  if (stored) return stored
  return readCookies()
}

export async function logout(): Promise<void> {
  clearSession()
  insertEvent('auth_expired', { reason: 'logout' })
}

export function storeUsername(username: string): void {
  const sess = loadSession()
  if (!sess) return
  saveSession({ ...sess, username })
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run('leetcode_username', username)
}
