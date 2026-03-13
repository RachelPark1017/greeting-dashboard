import type { GreetingResponse, PaginatedResponse, Opening, PassedApplicant } from './types'

const BASE_URL = 'https://oapi.greetinghr.com'

function getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const apiKey = process.env.GREETING_API_KEY
  if (!apiKey) throw new Error('GREETING_API_KEY 환경변수가 설정되지 않았습니다')
  return {
    'X-Greeting-OpenAPI': apiKey,
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
}

export async function fetchOpenings(page = 0, pageSize = 50): Promise<PaginatedResponse<Opening>> {
  const url = `${BASE_URL}/openapi/openings?page=${page}&pageSize=${pageSize}&status=OPEN`
  const res = await fetch(url, {
    headers: getHeaders({ 'X-Api-Version': '2.0' }),
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`공고 목록 조회 실패: ${res.status}`)
  const json: GreetingResponse<PaginatedResponse<Opening>> = await res.json()
  if (!json.success) throw new Error(json.message ?? '공고 목록 조회 실패')
  return json.data
}

export async function fetchPassedApplicants(
  page = 0,
  pageSize = 100,
  passDateGt?: string,
  passDateLt?: string
): Promise<PaginatedResponse<PassedApplicant>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (passDateGt) params.set('passDateGt', passDateGt)
  if (passDateLt) params.set('passDateLt', passDateLt)

  const res = await fetch(`${BASE_URL}/openapi/passed-applicants?${params}`, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`합격자 목록 조회 실패: ${res.status}`)
  const json: GreetingResponse<PaginatedResponse<PassedApplicant>> = await res.json()
  if (!json.success) throw new Error(json.message ?? '합격자 목록 조회 실패')
  return json.data
}
