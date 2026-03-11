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
