'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCards from './KpiCards'
import OpeningsPipeline from './OpeningsPipeline'
import ApplicantTable from './ApplicantTable'
import AnalyticsCharts from './AnalyticsCharts'
import type { DashboardStats, OpeningWithPassedCount, PassedApplicant } from '@/lib/types'

interface DashboardData {
  stats: DashboardStats
  openings: OpeningWithPassedCount[]
  passedApplicants: PassedApplicant[]
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5분

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setError(null)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">데이터 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">채용 대시보드</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            새로고침
          </button>
        </div>

        <div className="mb-6">
          <KpiCards stats={data.stats} />
        </div>

        <div className="mb-6">
          <OpeningsPipeline openings={data.openings} />
        </div>

        <div className="mb-6">
          <AnalyticsCharts passedApplicants={data.passedApplicants} />
        </div>

        <div className="mb-6">
          <ApplicantTable applicants={data.passedApplicants} />
        </div>
      </div>
    </main>
  )
}
