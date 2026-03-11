import { NextResponse } from 'next/server'
import { fetchOpenings, fetchPassedApplicants } from '@/lib/greeting-api'
import type { DashboardStats, OpeningWithPassedCount } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [openingsData, passedData] = await Promise.all([
      fetchOpenings(0, 50),
      fetchPassedApplicants(0, 100),
    ])

    // 이번 달 합격자
    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const thisMonthPassed = passedData.datas.filter(
      (a) => a.passDate >= thisMonthStart
    )

    // 평균 채용 소요일
    const daysToHireList = passedData.datas
      .filter((a) => a.submitDate && a.passDate)
      .map((a) => {
        const submit = new Date(a.submitDate).getTime()
        const pass = new Date(a.passDate).getTime()
        return Math.round((pass - submit) / (1000 * 60 * 60 * 24))
      })
      .filter((d) => d >= 0)

    const avgDaysToHire =
      daysToHireList.length > 0
        ? Math.round(daysToHireList.reduce((a, b) => a + b, 0) / daysToHireList.length)
        : null

    // 공고별 합격자 수
    const passedByOpening: Record<number, number> = {}
    passedData.datas.forEach((a) => {
      passedByOpening[a.openingId] = (passedByOpening[a.openingId] ?? 0) + 1
    })

    const openingsWithCount: OpeningWithPassedCount[] = openingsData.datas.map((o) => ({
      id: o.id,
      title: o.title,
      dueDate: o.dueDate,
      passedCount: passedByOpening[o.id] ?? 0,
    }))

    const stats: DashboardStats = {
      activeOpeningsCount: openingsData.totalCount,
      thisMonthPassedCount: thisMonthPassed.length,
      totalPassedCount: passedData.totalCount,
      avgDaysToHire,
    }

    return NextResponse.json({
      stats,
      openings: openingsWithCount,
      passedApplicants: passedData.datas,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
