import { NextResponse } from 'next/server'
import { getAuthToken, fetchFormResponses, FORM_IDS } from '@/lib/greeting-survey-api'
import type { SurveyStats, AllSurveyData } from '@/lib/types'

export const dynamic = 'force-dynamic'

function isMockMode() {
  const email = process.env.GREETING_EMAIL
  const passwordHash = process.env.GREETING_PASSWORD_HASH
  return !email || !passwordHash || email === '여기에_이메일_입력'
}

// Question ID mappings
const Q_IDS = {
  interview1: {
    guidance: 12642,
    experience: 12634,
    difficulty: 12635,
    nps: 12638,
    culture: 12750,
    comment: 12645,
  },
  interview2: {
    guidance: 12648,
    experience: 12649,
    convenience: 12664,
    difficulty: 12650,
    nps: 12653,
    comment: 12665,
  },
  coffeechat: {
    guidance: 17145,
    experience: 17139,
    helpfulness: 17140,
    nps: 17144,
    satisfactionFactors: 17141,
    comment: 17143,
  },
}

type RawAnswer = { questionId: number; value: unknown }
type RawResponse = { name: string; jobTitle: string; submitDate: string; answers: RawAnswer[] }

function getNumericAnswer(answers: RawAnswer[], questionId: number): number | null {
  const a = answers.find((x) => x.questionId === questionId)
  if (!a) return null
  const v = a.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }
  return null
}

function getStringAnswer(answers: RawAnswer[], questionId: number): string {
  const a = answers.find((x) => x.questionId === questionId)
  if (!a || a.value == null) return ''
  return String(a.value).trim()
}

function getArrayAnswer(answers: RawAnswer[], questionId: number): string[] {
  const a = answers.find((x) => x.questionId === questionId)
  if (!a || !a.value) return []
  if (Array.isArray(a.value)) return (a.value as unknown[]).map(String).filter(Boolean)
  if (typeof a.value === 'string') return a.value.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null)
  if (valid.length === 0) return null
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

function scoreDistribution(nums: (number | null)[], min: number, max: number): number[] {
  const dist = Array(max - min + 1).fill(0)
  nums.forEach((n) => {
    if (n !== null && n >= min && n <= max) dist[n - min]++
  })
  return dist
}

function npsDistribution(nums: (number | null)[]): number[] {
  const dist = Array(11).fill(0)
  nums.forEach((n) => {
    if (n !== null && n >= 0 && n <= 10) dist[n]++
  })
  return dist
}

function monthlyCount(dates: string[]): { month: string; count: number }[] {
  const map: Record<string, number> = {}
  dates.forEach((d) => {
    const m = d.slice(0, 7) // YYYY-MM
    map[m] = (map[m] ?? 0) + 1
  })
  const sorted = Object.keys(map).sort()
  return sorted.map((m) => ({ month: m, count: map[m] }))
}

function counterArray(items: string[][]): { label: string; count: number }[] {
  const map: Record<string, number> = {}
  items.forEach((arr) => arr.forEach((s) => { map[s] = (map[s] ?? 0) + 1 }))
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function computeStats(
  responses: RawResponse[],
  qIds: {
    guidance?: number
    experience?: number
    difficulty?: number
    convenience?: number
    nps?: number
    culture?: number
    satisfactionFactors?: number
    comment?: number
  }
): SurveyStats {
  const guidances = responses.map((r) => (qIds.guidance ? getNumericAnswer(r.answers, qIds.guidance) : null))
  const experiences = responses.map((r) => (qIds.experience ? getNumericAnswer(r.answers, qIds.experience) : null))
  const difficulties = responses.map((r) => (qIds.difficulty ? getNumericAnswer(r.answers, qIds.difficulty) : null))
  const conveniences = responses.map((r) => (qIds.convenience ? getNumericAnswer(r.answers, qIds.convenience) : null))
  const npsList = responses.map((r) => (qIds.nps ? getNumericAnswer(r.answers, qIds.nps) : null))

  const validNps = npsList.filter((n): n is number => n !== null)
  const promoters = validNps.filter((n) => n >= 9).length
  const passives = validNps.filter((n) => n >= 7 && n <= 8).length
  const detractors = validNps.filter((n) => n <= 6).length
  const npsScore = validNps.length > 0
    ? Math.round(((promoters - detractors) / validNps.length) * 100)
    : 0

  const cultureArrays = qIds.culture
    ? responses.map((r) => getArrayAnswer(r.answers, qIds.culture!))
    : []
  const satisfactionArrays = qIds.satisfactionFactors
    ? responses.map((r) => getArrayAnswer(r.answers, qIds.satisfactionFactors!))
    : []

  const comments = responses
    .map((r) => ({
      name: r.name,
      job: r.jobTitle,
      comment: qIds.comment ? getStringAnswer(r.answers, qIds.comment) : '',
      nps: qIds.nps ? getNumericAnswer(r.answers, qIds.nps) : null,
    }))
    .filter((c) => c.comment.length > 0)

  return {
    totalCount: responses.length,
    avgGuidance: avg(guidances),
    avgExperience: avg(experiences),
    avgDifficulty: avg(difficulties),
    avgConvenience: avg(conveniences),
    nps: npsScore,
    promoters,
    passives,
    detractors,
    npsDistribution: npsDistribution(npsList),
    guidanceDistribution: scoreDistribution(guidances, 1, 5),
    experienceDistribution: scoreDistribution(experiences, 1, 5),
    difficultyDistribution: scoreDistribution(difficulties, 1, 5),
    cultureTags: counterArray(cultureArrays),
    satisfactionFactors: counterArray(satisfactionArrays),
    monthly: monthlyCount(responses.map((r) => r.submitDate)),
    comments,
  }
}

function getMockData(): AllSurveyData {
  const mockResponses1: RawResponse[] = [
    { name: '김민수', jobTitle: '개발자', submitDate: '2025-01-15', answers: [
      { questionId: 12642, value: 4 }, { questionId: 12634, value: 5 }, { questionId: 12635, value: 3 },
      { questionId: 12638, value: 9 }, { questionId: 12750, value: ['체계적', '친절함'] }, { questionId: 12645, value: '전반적으로 만족스러운 면접이었습니다.' },
    ]},
    { name: '이서연', jobTitle: 'PM', submitDate: '2025-02-10', answers: [
      { questionId: 12642, value: 5 }, { questionId: 12634, value: 4 }, { questionId: 12635, value: 2 },
      { questionId: 12638, value: 10 }, { questionId: 12750, value: ['편안함', '전문적'] }, { questionId: 12645, value: '안내가 충분하고 면접관이 친절했어요.' },
    ]},
    { name: '박지훈', jobTitle: '디자이너', submitDate: '2025-02-20', answers: [
      { questionId: 12642, value: 3 }, { questionId: 12634, value: 4 }, { questionId: 12635, value: 4 },
      { questionId: 12638, value: 7 }, { questionId: 12750, value: ['체계적'] }, { questionId: 12645, value: '' },
    ]},
    { name: '최영희', jobTitle: '마케터', submitDate: '2025-03-05', answers: [
      { questionId: 12642, value: 4 }, { questionId: 12634, value: 3 }, { questionId: 12635, value: 3 },
      { questionId: 12638, value: 8 }, { questionId: 12750, value: ['친절함', '편안함'] }, { questionId: 12645, value: '좀 더 상세한 안내가 있으면 좋겠어요.' },
    ]},
    { name: '정하늘', jobTitle: '개발자', submitDate: '2025-03-15', answers: [
      { questionId: 12642, value: 5 }, { questionId: 12634, value: 5 }, { questionId: 12635, value: 2 },
      { questionId: 12638, value: 10 }, { questionId: 12750, value: ['전문적', '체계적', '친절함'] }, { questionId: 12645, value: '역대 가장 좋은 면접 경험이었습니다!' },
    ]},
  ]

  const mockResponses2: RawResponse[] = [
    { name: '김민수', jobTitle: '개발자', submitDate: '2025-01-20', answers: [
      { questionId: 12648, value: 4 }, { questionId: 12649, value: 4 }, { questionId: 12664, value: 4 },
      { questionId: 12650, value: 3 }, { questionId: 12653, value: 8 }, { questionId: 12665, value: '2차도 좋은 경험이었습니다.' },
    ]},
    { name: '이서연', jobTitle: 'PM', submitDate: '2025-02-15', answers: [
      { questionId: 12648, value: 5 }, { questionId: 12649, value: 5 }, { questionId: 12664, value: 5 },
      { questionId: 12650, value: 2 }, { questionId: 12653, value: 9 }, { questionId: 12665, value: '온라인 면접이 편리했어요.' },
    ]},
    { name: '박지훈', jobTitle: '디자이너', submitDate: '2025-02-25', answers: [
      { questionId: 12648, value: 3 }, { questionId: 12649, value: 4 }, { questionId: 12664, value: 3 },
      { questionId: 12650, value: 4 }, { questionId: 12653, value: 6 }, { questionId: 12665, value: '일정 조율이 어려웠습니다.' },
    ]},
  ]

  const mockResponsesCoffee: RawResponse[] = [
    { name: '정하늘', jobTitle: '개발자', submitDate: '2025-03-10', answers: [
      { questionId: 17145, value: 5 }, { questionId: 17139, value: 5 }, { questionId: 17140, value: 5 },
      { questionId: 17144, value: 10 }, { questionId: 17141, value: ['문화 이해', '팀 분위기'] }, { questionId: 17143, value: '회사 분위기를 잘 파악할 수 있었어요.' },
    ]},
    { name: '최영희', jobTitle: '마케터', submitDate: '2025-03-12', answers: [
      { questionId: 17145, value: 4 }, { questionId: 17139, value: 4 }, { questionId: 17140, value: 4 },
      { questionId: 17144, value: 9 }, { questionId: 17141, value: ['업무 이해', '팀원 소통'] }, { questionId: 17143, value: '실무자와 직접 대화할 수 있어서 좋았습니다.' },
    ]},
  ]

  return {
    interview1: computeStats(mockResponses1, Q_IDS.interview1),
    interview2: computeStats(mockResponses2, Q_IDS.interview2),
    coffeechat: computeStats(mockResponsesCoffee, Q_IDS.coffeechat),
  }
}

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json(getMockData())
  }

  try {
    const token = await getAuthToken()

    const [responses1, responses2, responsesCoffee] = await Promise.all([
      fetchFormResponses(token, FORM_IDS.interview1),
      fetchFormResponses(token, FORM_IDS.interview2),
      fetchFormResponses(token, FORM_IDS.coffeechat),
    ])

    const result: AllSurveyData = {
      interview1: computeStats(responses1, Q_IDS.interview1),
      interview2: computeStats(responses2, Q_IDS.interview2),
      coffeechat: computeStats(responsesCoffee, Q_IDS.coffeechat),
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
