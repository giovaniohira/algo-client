export interface ProblemDetail {
  slug: string
  title: string
  difficulty: string
  content: string
  questionId: string
  questionFrontendId: string
  acRate: number | null
  sampleTestCase: string
  codeSnippets: Array<{ lang: string; langSlug: string; code: string }>
  topicTags: string[]
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

export interface Profile {
  username: string
  ranking: number
  solved: number
  avatarUrl: string
  isPremium: boolean
}

export interface ProblemSummary {
  id: string
  slug: string
  title: string
  difficulty: string
  status: string | null
  acRate: number | null
  tags: Array<{ name: string; slug: string }>
}

export interface ProblemListResult {
  total: number
  hasMore: boolean
  questions: ProblemSummary[]
}

export interface AlgoClientApi {
  authStatus: () => Promise<
    | { authenticated: true; profile: Profile }
    | { authenticated: false; error?: string }
  >
  authLogin: () => Promise<Profile>
  authLogout: () => Promise<{ ok: boolean }>
  loadProblem: (slug: string) => Promise<{ problem: ProblemDetail; problemId: number }>
  listProblems: (opts?: {
    search?: string
    offset?: number
    limit?: number
  }) => Promise<ProblemListResult>
  syncProblemStatuses: () => Promise<Record<string, string | null>>
  attemptLanguages: () => Promise<Record<string, string[]>>
  tagOptions: () => Promise<Array<{ name: string; slug: string }>>
  startSession: (problemId: number, language: string, code: string) => Promise<{ attemptId: number }>
  recordHint: (level: number) => Promise<{ ok: boolean }>
  recordSolutionViewed: () => Promise<{ ok: boolean }>
  getElapsed: () => Promise<number>
  runCode: (
    slug: string,
    questionId: number,
    lang: string,
    code: string,
    dataInput: string
  ) => Promise<JudgeResult>
  submitCode: (
    slug: string,
    questionId: number,
    lang: string,
    code: string,
    problemId: number
  ) => Promise<{ result: JudgeResult; outcome: string }>
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<boolean>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  onWindowMaximized: (callback: (maximized: boolean) => void) => () => void
}

declare global {
  interface Window {
    algoClient: AlgoClientApi
  }
}

export {}
