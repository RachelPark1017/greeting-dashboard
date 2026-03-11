'use client'

import { useEffect, useState, useCallback } from 'react'
import OverviewTab from './OverviewTab'
import FunnelTab from './FunnelTab'
import ChannelTab from './ChannelTab'
import type { DashboardResponse } from '@/lib/types'

const REFRESH_INTERVAL = 5 * 60 * 1000

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'funnel', label: '채용 현황' },
  { key: 'channel', label: '채널 분석' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

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
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
          <p className="text-sm text-zinc-500">데이터 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 max-w-md text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-md text-sm font-medium h-9 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">채용 대시보드</h1>
            {lastUpdated && (
              <span className="hidden sm:inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-500">
                {lastUpdated.toLocaleTimeString('ko-KR')} 업데이트
              </span>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="inline-flex items-center rounded-md text-sm font-medium h-8 px-3 border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <svg className="mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            새로고침
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={data.stats}
            monthlyTrend={data.monthlyTrend}
            channelStats={data.channelStats}
            openingDetails={data.openingDetails}
          />
        )}
        {activeTab === 'funnel' && (
          <FunnelTab
            passedApplicants={data.passedApplicants}
            openings={data.openings}
          />
        )}
        {activeTab === 'channel' && (
          <ChannelTab
            channelStats={data.channelStats}
            passedApplicants={data.passedApplicants}
          />
        )}
      </main>
    </div>
  )
}
