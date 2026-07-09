import { LeetCode, Credential } from 'leetcode-query'
import type { AccountSession } from '../auth'
import { formatSolutionContent } from './solution-content'

const BASE = 'https://leetcode.com'
const MIN_SUBMIT_INTERVAL_MS = 2000
const STATUS_PAGE_SIZE = 100
const STATUS_FETCH_CONCURRENCY = 6

let lastSubmitAt = 0

export interface ProblemDetail {
  slug: string
  title: string
  difficulty: string
  content: string
  questionId: string
  questionFrontendId: string
  acRate: number | null
  sampleTestCase: string
  exampleTestcases: string
  codeSnippets: Array<{ lang: string; langSlug: string; code: string }>
  topicTags: string[]
  hints: string[]
}

export interface SubmissionSummary {
  id: number
  statusDisplay: string
  lang: string
  runtime: string
  memory: string
  timestamp: number
}

export interface SubmissionDetail {
  id: number
  code: string
  lang: string
  runtimeDisplay: string
  memoryDisplay: string
  timestamp: number
}

export interface SolutionArticle {
  id: number
  title: string
  content: string
  viewCount: number
  tags: string[]
  author: string
  voteCount: number
}

export interface JudgeResult {
  state: string
  statusMsg: string
  runSuccess: boolean
  totalCorrect?: number
  totalTestcases?: number
  runtimeMs?: number
  statusRuntime?: string
  memoryKb?: number
  statusMemory?: string
  compareResult?: string
  codeAnswer?: string[]
  codeOutput?: string[]
  stdOutput?: string
  lastTestcase?: string
  expectedOutput?: string
  runtimeError?: string
  fullRuntimeError?: string
  compileError?: string
  fullCompileError?: string
  submissionId?: string
}

function strField(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key]
  return v != null && String(v).trim() !== '' ? String(v) : undefined
}

function parseRuntimeMs(raw: unknown): number | undefined {
  if (raw == null) return undefined
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : undefined
}

function mapCheckResult(data: Record<string, unknown>): JudgeResult {
  const codeOutput = Array.isArray(data.code_output) ? (data.code_output as string[]) : undefined
  return {
    state: String(data.state),
    statusMsg: String(data.status_msg ?? ''),
    runSuccess: Boolean(data.run_success),
    totalCorrect: data.total_correct != null ? Number(data.total_correct) : undefined,
    totalTestcases: data.total_testcases != null ? Number(data.total_testcases) : undefined,
    runtimeMs: parseRuntimeMs(data.status_runtime),
    statusRuntime: strField(data, 'status_runtime'),
    memoryKb: data.memory != null ? Number(data.memory) : undefined,
    statusMemory: strField(data, 'status_memory'),
    compareResult: strField(data, 'compare_result'),
    codeAnswer: Array.isArray(data.code_answer) ? (data.code_answer as string[]) : undefined,
    codeOutput,
    stdOutput: strField(data, 'std_output') ?? codeOutput?.join('\n'),
    lastTestcase: strField(data, 'last_testcase'),
    expectedOutput: strField(data, 'expected_output'),
    runtimeError: strField(data, 'runtime_error'),
    fullRuntimeError: strField(data, 'full_runtime_error'),
    compileError: strField(data, 'compile_error'),
    fullCompileError: strField(data, 'full_compile_error'),
    submissionId: data.submission_id != null ? String(data.submission_id) : undefined
  }
}

function headers(sess: AccountSession, slug?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie: `LEETCODE_SESSION=${sess.leetcodeSession}; csrftoken=${sess.csrfToken}`,
    'x-csrftoken': sess.csrfToken,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
  if (slug) {
    h.Referer = `${BASE}/problems/${slug}/`
  }
  return h
}

async function throttleSubmit(): Promise<void> {
  const elapsed = Date.now() - lastSubmitAt
  if (elapsed < MIN_SUBMIT_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_SUBMIT_INTERVAL_MS - elapsed))
  }
  lastSubmitAt = Date.now()
}

async function pollCheck(
  sess: AccountSession,
  checkId: string | number,
  slug: string,
  timeoutMs = 120_000,
  intervalMs = 1500
): Promise<JudgeResult> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/submissions/detail/${checkId}/check/`, {
      headers: headers(sess, slug)
    })
    if (!res.ok) throw new Error(`Check failed: HTTP ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    if (data.state === 'SUCCESS') {
      return mapCheckResult(data)
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error('Timed out waiting for judge')
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export class PlatformAdapter {
  private credential: Credential
  private client: LeetCode

  constructor(private sess: AccountSession) {
    this.credential = new Credential({
      session: sess.leetcodeSession,
      csrf: sess.csrfToken
    })
    this.client = new LeetCode(this.credential)
  }

  updateSession(sess: AccountSession): void {
    this.sess = sess
    this.credential = new Credential({
      session: sess.leetcodeSession,
      csrf: sess.csrfToken
    })
    this.client = new LeetCode(this.credential)
  }

  async getProfile(): Promise<{
    username: string
    ranking: number
    solved: number
    avatarUrl: string
    isPremium: boolean
  }> {
    const userStatus = await this.client.whoami()
    if (!userStatus?.isSignedIn) throw new Error('Session expired')

    const username = userStatus.username ?? 'unknown'
    const profile = await this.client.user(username)
    const matched = profile.matchedUser as {
      submitStats?: { acSubmissionNum?: Array<{ difficulty: string; count: number }> }
      profile?: { ranking?: number; userAvatar?: string }
    } | null
    const solved =
      matched?.submitStats?.acSubmissionNum?.find((s) => s.difficulty === 'All')?.count ?? 0

    return {
      username,
      ranking: matched?.profile?.ranking ?? 0,
      solved,
      avatarUrl: matched?.profile?.userAvatar ?? '',
      isPremium: Boolean(userStatus.isPremium)
    }
  }

  async syncStatuses(): Promise<Record<string, string | null>> {
    const pageSize = STATUS_PAGE_SIZE
    const first = await this.client.problems({ offset: 0, limit: pageSize })
    const total = first.total ?? first.questions.length
    const statuses: Record<string, string | null> = {}

    for (const q of first.questions) {
      statuses[q.titleSlug] = q.status ?? null
    }

    const pageCount = Math.ceil(total / pageSize)
    if (pageCount > 1) {
      const offsets = Array.from({ length: pageCount - 1 }, (_, i) => (i + 1) * pageSize)
      const pages = await mapPool(offsets, STATUS_FETCH_CONCURRENCY, (offset) =>
        this.client.problems({ offset, limit: pageSize })
      )
      for (const page of pages) {
        for (const q of page.questions) {
          statuses[q.titleSlug] = q.status ?? null
        }
      }
    }

    return statuses
  }

  async getProblem(slug: string): Promise<ProblemDetail> {
    const q = await this.client.problem(slug)
    let acRate: number | null = null
    try {
      const stats = JSON.parse(q.stats) as { acRate?: string }
      if (stats.acRate) acRate = parseFloat(stats.acRate)
    } catch {
      /* ponytail: acRate optional when stats are malformed */
    }

    return {
      slug: q.titleSlug,
      title: q.title,
      difficulty: q.difficulty,
      content: q.content,
      questionId: q.questionId,
      questionFrontendId: q.questionFrontendId,
      acRate,
      sampleTestCase: q.sampleTestCase ?? q.exampleTestcases ?? '',
      exampleTestcases: q.exampleTestcases ?? q.sampleTestCase ?? '',
      codeSnippets: q.codeSnippets,
      topicTags: q.topicTags.map((t) => t.name),
      hints: q.hints ?? []
    }
  }

  async getSubmissions(slug: string, limit = 50): Promise<SubmissionSummary[]> {
    const { data } = await this.client.graphql({
      operationName: 'questionSubmissionList',
      variables: { questionSlug: slug, offset: 0, limit },
      query: `query questionSubmissionList($questionSlug: String!, $offset: Int!, $limit: Int!) {
        questionSubmissionList(questionSlug: $questionSlug, offset: $offset, limit: $limit) {
          submissions {
            id
            statusDisplay
            langName
            runtime
            memory
            timestamp
          }
        }
      }`
    })
    const rows = data?.questionSubmissionList?.submissions ?? []
    return rows.map((s: Record<string, unknown>) => {
      const ts = Number(s.timestamp)
      return {
        id: Number(s.id),
        statusDisplay: String(s.statusDisplay ?? ''),
        lang: String(s.langName ?? s.lang ?? ''),
        runtime: String(s.runtime ?? ''),
        memory: String(s.memory ?? ''),
        timestamp: ts < 1e12 ? ts * 1000 : ts
      }
    })
  }

  async getSubmissionDetail(id: number): Promise<SubmissionDetail> {
    const s = await this.client.submission(id)
    return {
      id: s.id,
      code: s.code,
      lang: s.lang?.verboseName ?? s.lang?.name ?? '',
      runtimeDisplay: s.runtimeDisplay ?? '',
      memoryDisplay: s.memoryDisplay ?? '',
      timestamp: s.timestamp
    }
  }

  async getSolutionArticles(slug: string, skip = 0, first = 20): Promise<SolutionArticle[]> {
    const { data } = await this.client.graphql({
      operationName: 'communitySolutions',
      variables: {
        questionSlug: slug,
        skip,
        first,
        query: '',
        orderBy: 'hot',
        languageTags: [],
        topicTags: []
      },
      query: `query communitySolutions($questionSlug: String!, $skip: Int!, $first: Int!, $query: String, $orderBy: TopicSortingOption, $languageTags: [String!], $topicTags: [String!]) {
        questionSolutions(
          filters: { questionSlug: $questionSlug, skip: $skip, first: $first, query: $query, orderBy: $orderBy, languageTags: $languageTags, topicTags: $topicTags }
        ) {
          solutions {
            id
            title
            viewCount
            solutionTags { name }
            post {
              voteCount
              content
              author { username }
            }
            searchMeta { content }
          }
        }
      }`
    })
    const solutions = data?.questionSolutions?.solutions ?? []
    return solutions.map((s: Record<string, unknown>) => {
      const post = s.post as Record<string, unknown> | undefined
      const searchMeta = s.searchMeta as Record<string, unknown> | undefined
      const tags = Array.isArray(s.solutionTags) ? (s.solutionTags as Array<{ name: string }>) : []
      const author = post?.author as Record<string, unknown> | undefined
      return {
        id: Number(s.id),
        title: String(s.title ?? ''),
        content: formatSolutionContent(String(post?.content ?? searchMeta?.content ?? '')),
        viewCount: Number(s.viewCount ?? 0),
        tags: tags.map((t) => t.name),
        author: String(author?.username ?? ''),
        voteCount: Number(post?.voteCount ?? 0)
      }
    })
  }

  async runCode(
    slug: string,
    questionId: number,
    lang: string,
    code: string,
    dataInput: string
  ): Promise<JudgeResult> {
    await throttleSubmit()
    const res = await fetch(`${BASE}/problems/${slug}/interpret_solution/`, {
      method: 'POST',
      headers: headers(this.sess, slug),
      body: JSON.stringify({
        data_input: dataInput,
        lang,
        question_id: questionId,
        test_mode: false,
        typed_code: code
      })
    })
    if (!res.ok) throw new Error(`Run failed: HTTP ${res.status}`)
    const body = (await res.json()) as { interpret_id?: string; interpret_expected_id?: string }
    const checkId = body.interpret_id ?? body.interpret_expected_id
    if (!checkId) throw new Error('Run response missing interpret_id')
    return pollCheck(this.sess, checkId, slug)
  }

  async submitCode(slug: string, questionId: number, lang: string, code: string): Promise<JudgeResult> {
    await throttleSubmit()
    const res = await fetch(`${BASE}/problems/${slug}/submit/`, {
      method: 'POST',
      headers: headers(this.sess, slug),
      body: JSON.stringify({
        lang,
        question_id: questionId,
        typed_code: code,
        test_mode: false,
        judge_type: 'large'
      })
    })
    if (!res.ok) throw new Error(`Submit failed: HTTP ${res.status}`)
    const body = (await res.json()) as { submission_id?: number }
    if (!body.submission_id) throw new Error('Submit response missing submission_id')
    return pollCheck(this.sess, body.submission_id, slug)
  }
}

let adapter: PlatformAdapter | null = null

export async function getAdapter(sess: AccountSession): Promise<PlatformAdapter> {
  if (!adapter) {
    adapter = new PlatformAdapter(sess)
  } else {
    adapter.updateSession(sess)
  }
  return adapter
}

export function resetAdapter(): void {
  adapter = null
}

export function outcomeFromResult(result: JudgeResult): string {
  const msg = result.statusMsg.toLowerCase()
  if (msg.includes('accepted')) return 'accepted'
  if (msg.includes('time limit')) return 'tle'
  if (msg.includes('wrong')) return 'wrong'
  return 'wrong'
}
