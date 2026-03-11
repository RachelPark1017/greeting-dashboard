// 공통 페이지네이션 응답
export interface PaginatedResponse<T> {
  page: number
  pageSize: number
  totalCount: number
  totalPage: number
  hasPrev: boolean
  hasNext: boolean
  datas: T[]
}

export interface GreetingResponse<T> {
  success: boolean
  data: T
  message: string | null
  errorCode: string | null
}

// 공고
export interface Opening {
  id: number
  title: string
  dueDate: string | null
  url: string
  activatedAtCareerPage: boolean
  openingJobPositionInfo: {
    openingJobPositions: Array<{
      jobPositionField: { field: string } | null
      jobPositionOccupation: { occupation: string } | null
      jobPositionJob: { job: string } | null
      jobPositionPlace: { place: string } | null
      jobPositionCareer: { careerType: string } | null
      jobPositionEmployment: { employment: string } | null
    }>
  } | null
}

// 합격자
export interface PassedApplicant {
  id: number
  name: string
  email: string
  phone: string
  submitDate: string
  passDate: string
  score: number | null
  quickNote: string | null
  referer: string | null
  refererName: string | null
  openingId: number
  openingTitle: string
  desiredJobPositions: Array<{
    id: number
    priority: number
    field: string | null
    occupation: string | null
    job: string | null
    place: string | null
    career: string | null
    employment: string | null
  }>
}

// 대시보드용 집계 타입
export interface DashboardStats {
  activeOpeningsCount: number
  thisMonthPassedCount: number
  totalPassedCount: number
  avgDaysToHire: number | null
}

export interface OpeningWithPassedCount {
  id: number
  title: string
  dueDate: string | null
  passedCount: number
}

// 채널 통계
export interface ChannelStat {
  channel: string
  count: number
  avgScore: number | null
  avgDays: number | null
}

// 월별 추이
export interface MonthlyTrend {
  month: string
  passed: number
}

// 공고 상세 (개요 테이블용)
export interface OpeningDetail {
  id: number
  title: string
  field: string | null
  career: string | null
  passedCount: number
}

// 전체 대시보드 API 응답
export interface DashboardResponse {
  stats: DashboardStats
  openings: OpeningWithPassedCount[]
  passedApplicants: PassedApplicant[]
  channelStats: ChannelStat[]
  monthlyTrend: MonthlyTrend[]
  openingDetails: OpeningDetail[]
}
