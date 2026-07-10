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

export interface Profile {
  username: string
  ranking: number
  solved: number
  solvedEasy: number
  solvedMedium: number
  solvedHard: number
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

export interface CatalogStatus {
  exists: boolean
  syncedAt: string | null
  total: number
  stale: boolean
  syncing: boolean
}

export interface CatalogSyncProgress {
  phase: 'listing'
  done: number
  total: number
}

export interface AlgoClientApi {
  authStatus: () => Promise<
    | { authenticated: true; profile: Profile }
    | { authenticated: false; error?: string }
  >
  authLogin: () => Promise<Profile>
  authLogout: () => Promise<{ ok: boolean }>
  loadProblem: (slug: string) => Promise<{ problem: ProblemDetail }>
  listSubmissions: (slug: string, limit?: number) => Promise<SubmissionSummary[]>
  loadSubmissionDetail: (id: number) => Promise<SubmissionDetail>
  listSolutions: (slug: string, skip?: number, first?: number) => Promise<SolutionArticle[]>
  listProblems: (opts?: {
    search?: string
    offset?: number
    limit?: number
  }) => Promise<ProblemListResult>
  syncProblemStatuses: () => Promise<Record<string, string | null>>
  tagOptions: () => Promise<Array<{ name: string; slug: string }>>
  catalogStatus: () => Promise<CatalogStatus>
  syncCatalog: () => Promise<{ total: number; syncedAt: string }>
  catalogSlugs: () => Promise<string[]>
  onCatalogSyncProgress: (callback: (progress: CatalogSyncProgress) => void) => () => void
  onCatalogSyncDone: (callback: () => void) => () => void
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
    code: string
  ) => Promise<{ result: JudgeResult; outcome: string }>
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<boolean>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  zoomGet: () => Promise<number>
  zoomIn: () => Promise<number>
  zoomOut: () => Promise<number>
  zoomReset: () => Promise<number>
  onZoomChanged: (callback: (factor: number) => void) => () => void
  onWindowMaximized: (callback: (maximized: boolean) => void) => () => void
}

declare global {
  interface Window {
    algoClient: AlgoClientApi
  }
}

export {}
