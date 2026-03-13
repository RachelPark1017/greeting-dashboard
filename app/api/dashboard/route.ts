import { NextResponse } from 'next/server'
import { fetchOpenings, fetchPassedApplicants, fetchFormsAnswer } from '@/lib/greeting-api'
import type {
  DashboardStats,
  OpeningWithPassedCount,
  PassedApplicant,
  ChannelStat,
  MonthlyTrend,
  OpeningDetail,
  Opening,
  SurveyAggregated,
  FormResponse,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

function isMockMode() {
  const key = process.env.GREETING_API_KEY
  return !key || key === '여기에_API_키_입력'
}

function normalizeReferer(referer: string | null): string {
  if (!referer) return '기타'
  const lower = referer.toLowerCase().replace(/\s+/g, '')
  if (lower.includes('saramin')) return '사람인'
  if (lower.includes('사람인')) return '사람인'
  if (lower.includes('jobkorea')) return '잡코리아'
  if (lower.includes('잡코리아')) return '잡코리아'
  if (lower.includes('wanted')) return '원티드'
  if (lower.includes('원티드')) return '원티드'
  if (lower.includes('jumpit') || lower.includes('점핏')) return '점핏'
  if (lower.includes('사내추천') || lower.includes('내부추천') || lower === 'internal') return '사내추천'
  return '기타'
}

function computeChannelStats(passedApplicants: PassedApplicant[]): ChannelStat[] {
  const channelMap: Record<string, { count: number; scores: number[]; days: number[] }> = {}
  passedApplicants.forEach((a) => {
    const ch = normalizeReferer(a.referer)
    if (!channelMap[ch]) channelMap[ch] = { count: 0, scores: [], days: [] }
    channelMap[ch].count++
    if (a.score != null) channelMap[ch].scores.push(a.score)
    if (a.submitDate && a.passDate) {
      const d = Math.round(
        (new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24),
      )
      if (d >= 0) channelMap[ch].days.push(d)
    }
  })
  return Object.entries(channelMap)
    .map(([channel, v]) => ({
      channel,
      count: v.count,
      avgScore: v.scores.length > 0 ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : null,
      avgDays: v.days.length > 0 ? Math.round(v.days.reduce((a, b) => a + b, 0) / v.days.length) : null,
    }))
    .sort((a, b) => b.count - a.count)
}

function computeMonthlyTrend(passedApplicants: PassedApplicant[]): MonthlyTrend[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}월`
    const start = `${monthStr}-01`
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`

    const passed = passedApplicants.filter(
      (a) => a.passDate >= start && a.passDate <= end,
    ).length

    return { month: label, passed }
  })
}

function computeOpeningDetails(
  openingsRaw: OpeningWithPassedCount[],
  openingsFullData?: Opening[],
): OpeningDetail[] {
  return openingsRaw.map((o) => {
    let field: string | null = null
    let career: string | null = null

    if (openingsFullData) {
      const full = openingsFullData.find((f) => f.id === o.id)
      if (full?.openingJobPositionInfo?.openingJobPositions?.[0]) {
        const pos = full.openingJobPositionInfo.openingJobPositions[0]
        field = pos.jobPositionField?.field ?? null
        career = pos.jobPositionCareer?.careerType ?? null
      }
    }

    return { id: o.id, title: o.title, field, career, passedCount: o.passedCount }
  })
}

function aggregateSurveys(allResponses: FormResponse[]): SurveyAggregated[] {
  const byForm: Record<string, { formTitle: string; responses: FormResponse[] }> = {}
  for (const r of allResponses) {
    if (!byForm[r.formTitle]) byForm[r.formTitle] = { formTitle: r.formTitle, responses: [] }
    byForm[r.formTitle].responses.push(r)
  }

  return Object.values(byForm).map(({ formTitle, responses }) => {
    const questionMap: Record<string, Record<string, number>> = {}
    for (const r of responses) {
      for (const a of r.answers) {
        if (!questionMap[a.questionTitle]) questionMap[a.questionTitle] = {}
        for (const ans of a.answers) {
          const content = ans.answerContent || '(무응답)'
          questionMap[a.questionTitle][content] = (questionMap[a.questionTitle][content] ?? 0) + 1
        }
      }
    }

    return {
      formTitle,
      totalResponses: responses.length,
      questions: Object.entries(questionMap).map(([questionTitle, dist]) => ({
        questionTitle,
        answerDistribution: Object.entries(dist)
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count),
      })),
    }
  })
}

function computeDaysToHire(applicants: PassedApplicant[]): number | null {
  const days = applicants
    .filter((a) => a.submitDate && a.passDate)
    .map((a) => Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d) => d >= 0)
  return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null
}

function getMockData() {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth =
    now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const openings: OpeningWithPassedCount[] = [
    { id: 1, title: '프론트엔드 개발자', dueDate: `${thisMonth}-30`, passedCount: 3 },
    { id: 2, title: '백엔드 개발자', dueDate: `${thisMonth}-25`, passedCount: 2 },
    { id: 3, title: 'PM / PO', dueDate: `${thisMonth}-20`, passedCount: 1 },
    { id: 4, title: 'UX 디자이너', dueDate: null, passedCount: 2 },
    { id: 5, title: '데이터 엔지니어', dueDate: `${thisMonth}-28`, passedCount: 0 },
  ]

  // 활성 공고 합격자 + 보관된 공고 합격자 모두 포함 (수습/talent pool 제외)
  const passedApplicants: PassedApplicant[] = [
    { id: 101, name: '김민수', email: 'minsu@example.com', phone: '010-1234-5678', submitDate: `${lastMonth}-05`, passDate: `${thisMonth}-02`, score: 92, quickNote: '기술면접 우수', referer: 'saramin', refererName: null, openingId: 1, openingTitle: '프론트엔드 개발자', desiredJobPositions: [] },
    { id: 102, name: '이서연', email: 'seoyeon@example.com', phone: '010-2345-6789', submitDate: `${lastMonth}-10`, passDate: `${thisMonth}-05`, score: 88, quickNote: null, referer: 'wanted', refererName: null, openingId: 1, openingTitle: '프론트엔드 개발자', desiredJobPositions: [] },
    { id: 103, name: '박지훈', email: 'jihoon@example.com', phone: '010-3456-7890', submitDate: `${lastMonth}-12`, passDate: `${thisMonth}-08`, score: 95, quickNote: '포트폴리오 인상적', referer: 'internal', refererName: '최영희', openingId: 2, openingTitle: '백엔드 개발자', desiredJobPositions: [] },
    { id: 104, name: '정하늘', email: 'haneul@example.com', phone: '010-4567-8901', submitDate: `${lastMonth}-15`, passDate: `${thisMonth}-10`, score: 85, quickNote: null, referer: 'jobkorea', refererName: null, openingId: 1, openingTitle: '프론트엔드 개발자', desiredJobPositions: [] },
    { id: 105, name: '송예진', email: 'yejin@example.com', phone: '010-5678-9012', submitDate: `${lastMonth}-08`, passDate: `${lastMonth}-28`, score: 90, quickNote: '경력 5년', referer: 'saramin', refererName: null, openingId: 2, openingTitle: '백엔드 개발자', desiredJobPositions: [] },
    { id: 106, name: '윤도현', email: 'dohyun@example.com', phone: '010-6789-0123', submitDate: `${twoMonthsAgoStr}-20`, passDate: `${lastMonth}-30`, score: 87, quickNote: null, referer: 'wanted', refererName: null, openingId: 3, openingTitle: 'PM / PO', desiredJobPositions: [] },
    { id: 107, name: '한수빈', email: 'subin@example.com', phone: '010-7890-1234', submitDate: `${twoMonthsAgoStr}-01`, passDate: `${lastMonth}-20`, score: 91, quickNote: '커뮤니케이션 역량 우수', referer: 'internal', refererName: '김태연', openingId: 4, openingTitle: 'UX 디자이너', desiredJobPositions: [] },
    { id: 108, name: '오준서', email: 'junseo@example.com', phone: '010-8901-2345', submitDate: `${twoMonthsAgoStr}-18`, passDate: `${lastMonth}-25`, score: 83, quickNote: null, referer: 'jobkorea', refererName: null, openingId: 4, openingTitle: 'UX 디자이너', desiredJobPositions: [] },
    // 보관된 공고 합격자 (누적에 포함)
    { id: 109, name: '강태우', email: 'taewoo@example.com', phone: '010-9012-3456', submitDate: `${twoMonthsAgoStr}-05`, passDate: `${twoMonthsAgoStr}-25`, score: 89, quickNote: null, referer: 'saramin', refererName: null, openingId: 90, openingTitle: 'DevOps 엔지니어 (보관됨)', desiredJobPositions: [] },
    { id: 110, name: '임채원', email: 'chaewon@example.com', phone: '010-0123-4567', submitDate: `${twoMonthsAgoStr}-10`, passDate: `${twoMonthsAgoStr}-28`, score: 86, quickNote: null, referer: 'wanted', refererName: null, openingId: 91, openingTitle: '마케팅 매니저 (보관됨)', desiredJobPositions: [] },
  ]

  const thisMonthStart = `${thisMonth}-01`
  const thisMonthPassed = passedApplicants.filter((a) => a.passDate >= thisMonthStart)

  const stats: DashboardStats = {
    activeOpeningsCount: openings.length,
    thisMonthPassedCount: thisMonthPassed.length,
    totalPassedCount: passedApplicants.length,
    avgDaysToHire: computeDaysToHire(passedApplicants),
  }

  const channelStats = computeChannelStats(passedApplicants)
  const monthlyTrend = computeMonthlyTrend(passedApplicants)
  const openingDetails = computeOpeningDetails(openings)

  // mock에 직군/유형 추가
  const fieldMap: Record<number, { field: string; career: string }> = {
    1: { field: '개발', career: '경력' },
    2: { field: '개발', career: '경력' },
    3: { field: '기획', career: '경력' },
    4: { field: '디자인', career: '경력/신입' },
    5: { field: '개발', career: '경력' },
  }
  const enrichedDetails = openingDetails.map((d) => ({
    ...d,
    field: fieldMap[d.id]?.field ?? null,
    career: fieldMap[d.id]?.career ?? null,
  }))

  const mockSurveys: SurveyAggregated[] = [
    {
      formTitle: '커피챗 경험 설문조사',
      totalResponses: 8,
      questions: [
        { questionTitle: '커피챗 전반적 만족도', answerDistribution: [{ answer: '매우 만족', count: 5 }, { answer: '만족', count: 2 }, { answer: '보통', count: 1 }] },
        { questionTitle: '담당자의 설명이 충분했나요?', answerDistribution: [{ answer: '네', count: 7 }, { answer: '아니오', count: 1 }] },
        { questionTitle: '커피챗 후 지원 의향', answerDistribution: [{ answer: '지원하겠다', count: 6 }, { answer: '고민 중', count: 2 }] },
      ],
    },
    {
      formTitle: '1차 면접 경험 설문조사',
      totalResponses: 6,
      questions: [
        { questionTitle: '면접 분위기는 어땠나요?', answerDistribution: [{ answer: '편안했다', count: 4 }, { answer: '보통', count: 1 }, { answer: '긴장됐다', count: 1 }] },
        { questionTitle: '면접관의 태도는 어땠나요?', answerDistribution: [{ answer: '매우 좋음', count: 3 }, { answer: '좋음', count: 2 }, { answer: '보통', count: 1 }] },
        { questionTitle: '면접 과정에 대한 안내가 충분했나요?', answerDistribution: [{ answer: '네', count: 5 }, { answer: '아니오', count: 1 }] },
      ],
    },
    {
      formTitle: '2차 면접 경험 설문조사',
      totalResponses: 4,
      questions: [
        { questionTitle: '면접 분위기는 어땠나요?', answerDistribution: [{ answer: '편안했다', count: 3 }, { answer: '보통', count: 1 }] },
        { questionTitle: '회사에 대한 이해가 높아졌나요?', answerDistribution: [{ answer: '매우 그렇다', count: 2 }, { answer: '그렇다', count: 2 }] },
        { questionTitle: '전반적 만족도', answerDistribution: [{ answer: '매우 만족', count: 3 }, { answer: '만족', count: 1 }] },
      ],
    },
  ]

  return { stats, openings, passedApplicants, channelStats, monthlyTrend, openingDetails: enrichedDetails, surveys: mockSurveys }
}

const EXCLUDED_KEYWORDS = ['수습', 'talent pool', '커피챗']

function isExcluded(title: string) {
  const lower = title.toLowerCase()
  return EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json(getMockData())
  }

  try {
    const [openingsData, passedData] = await Promise.all([
      fetchOpenings(0, 50),
      fetchPassedApplicants(0, 100),
    ])

    // 활성 공고 (수습/talent pool/커피챗 제외)
    const filteredOpenings = openingsData.datas.filter((o) => !isExcluded(o.title))
    const activeOpeningIds = new Set(filteredOpenings.map((o) => o.id))

    // 전체 합격자 (수습/talent pool/커피챗만 제외, 보관/비활성 공고 합격자 포함)
    const allPassed = passedData.datas.filter((a) => !isExcluded(a.openingTitle))

    // 활성 공고 합격자만 (공고별 통계용)
    const activePassed = allPassed.filter((a) => activeOpeningIds.has(a.openingId))

    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const thisMonthPassed = allPassed.filter((a) => a.passDate >= thisMonthStart)

    // 공고별 합격자 수 (활성 공고만)
    const passedByOpening: Record<number, number> = {}
    activePassed.forEach((a) => {
      passedByOpening[a.openingId] = (passedByOpening[a.openingId] ?? 0) + 1
    })

    const openingsWithCount: OpeningWithPassedCount[] = filteredOpenings.map((o) => ({
      id: o.id,
      title: o.title,
      dueDate: o.dueDate,
      passedCount: passedByOpening[o.id] ?? 0,
    }))

    const stats: DashboardStats = {
      activeOpeningsCount: filteredOpenings.length,
      thisMonthPassedCount: thisMonthPassed.length,
      totalPassedCount: allPassed.length,         // 보관/비활성 포함
      avgDaysToHire: computeDaysToHire(allPassed), // 전체 기준
    }

    // 채널/트렌드: 전체 합격자 기준
    const channelStats = computeChannelStats(allPassed)
    const monthlyTrend = computeMonthlyTrend(allPassed)
    // 공고 상세: 활성 공고만
    const openingDetails = computeOpeningDetails(openingsWithCount, filteredOpenings)

    // 설문 데이터: 지원자별 폼 응답 병렬 조회 (최대 50명)
    const applicantIds = allPassed.slice(0, 50).map((a) => a.id)
    const formsResults = await Promise.all(applicantIds.map((id) => fetchFormsAnswer(id)))
    const allFormResponses = formsResults.flat()
    const surveys = aggregateSurveys(allFormResponses)

    return NextResponse.json({
      stats,
      openings: openingsWithCount,
      passedApplicants: allPassed,
      channelStats,
      monthlyTrend,
      openingDetails,
      surveys,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
