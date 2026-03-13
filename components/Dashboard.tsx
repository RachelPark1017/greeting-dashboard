'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import OverviewTab from './OverviewTab'
import FunnelTab from './FunnelTab'
import ChannelTab from './ChannelTab'
import type { DashboardResponse, DashboardStats, ChannelStat, MonthlyTrend, OpeningDetail } from '@/lib/types'

function normalizeReferer(referer: string | null): string {
  if (!referer) return '기타'
  const lower = referer.toLowerCase().replace(/\s+/g, '')
  if (lower.includes('saramin') || lower.includes('사람인')) return '사람인'
  if (lower.includes('jobkorea') || lower.includes('잡코리아')) return '잡코리아'
  if (lower.includes('wanted') || lower.includes('원티드')) return '원티드'
  if (lower.includes('jumpit') || lower.includes('점핏')) return '점핏'
  if (lower.includes('사내추천') || lower.includes('내부추천') || lower === 'internal') return '사내추천'
  return '기타'
}

const REFRESH_INTERVAL = 5 * 60 * 1000

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'funnel', label: '채용 현황' },
  { key: 'channel', label: '채널 분석' },
] as const

type TabKey = (typeof TABS)[number]['key']

const PERIOD_OPTIONS = [
  { key: 'all', label: '전체 기간' },
  { key: '1m', label: '최근 1개월' },
  { key: '3m', label: '최근 3개월' },
  { key: '6m', label: '최근 6개월' },
  { key: '1y', label: '최근 1년' },
] as const

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key']

function getPeriodStartDate(key: PeriodKey): string | null {
  if (key === 'all') return null
  const now = new Date()
  const months = key === '1m' ? 1 : key === '3m' ? 3 : key === '6m' ? 6 : 12
  const d = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [period, setPeriod] = useState<PeriodKey>('all')

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

  const filteredData = useMemo(() => {
    if (!data) return null
    const startDate = getPeriodStartDate(period)
    if (!startDate) return data

    const filteredPassed = data.passedApplicants.filter((a) => a.passDate >= startDate)

    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const thisMonthPassed = filteredPassed.filter((a) => a.passDate >= thisMonthStart)

    const daysToHireList = filteredPassed
      .filter((a) => a.submitDate && a.passDate)
      .map((a) => Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24)))
      .filter((d) => d >= 0)

    const stats: DashboardStats = {
      activeOpeningsCount: data.stats.activeOpeningsCount,
      thisMonthPassedCount: thisMonthPassed.length,
      totalPassedCount: filteredPassed.length,
      avgDaysToHire: daysToHireList.length > 0 ? Math.round(daysToHireList.reduce((a, b) => a + b, 0) / daysToHireList.length) : null,
    }

    const channelMap: Record<string, { count: number; scores: number[]; days: number[] }> = {}
    filteredPassed.forEach((a) => {
      const ch = normalizeReferer(a.referer)
      if (!channelMap[ch]) channelMap[ch] = { count: 0, scores: [], days: [] }
      channelMap[ch].count++
      if (a.score != null) channelMap[ch].scores.push(a.score)
      if (a.submitDate && a.passDate) {
        const d = Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24))
        if (d >= 0) channelMap[ch].days.push(d)
      }
    })
    const channelStats: ChannelStat[] = Object.entries(channelMap)
      .map(([channel, v]) => ({
        channel,
        count: v.count,
        avgScore: v.scores.length > 0 ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : null,
        avgDays: v.days.length > 0 ? Math.round(v.days.reduce((a, b) => a + b, 0) / v.days.length) : null,
      }))
      .sort((a, b) => b.count - a.count)

    const monthlyTrend: MonthlyTrend[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mStart = `${monthStr}-01`
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const mEnd = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`
      return {
        month: `${d.getMonth() + 1}월`,
        passed: filteredPassed.filter((a) => a.passDate >= mStart && a.passDate <= mEnd).length,
      }
    })

    const passedByOpening: Record<number, number> = {}
    filteredPassed.forEach((a) => { passedByOpening[a.openingId] = (passedByOpening[a.openingId] ?? 0) + 1 })
    const openings = data.openings.map((o) => ({ ...o, passedCount: passedByOpening[o.id] ?? 0 }))
    const openingDetails: OpeningDetail[] = data.openingDetails.map((d) => ({ ...d, passedCount: passedByOpening[d.id] ?? 0 }))

    return { ...data, stats, passedApplicants: filteredPassed, channelStats, monthlyTrend, openings, openingDetails }
  }, [data, period])

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

  if (!filteredData) return null

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
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
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
            stats={filteredData.stats}
            monthlyTrend={filteredData.monthlyTrend}
            channelStats={filteredData.channelStats}
            openingDetails={filteredData.openingDetails}
          />
        )}
        {activeTab === 'funnel' && (
          <FunnelTab
            passedApplicants={filteredData.passedApplicants}
            openings={filteredData.openings}
          />
        )}
        {activeTab === 'channel' && (
          <ChannelTab
            channelStats={filteredData.channelStats}
            passedApplicants={filteredData.passedApplicants}
          />
        )}
      </main>
    </div>
  )
}
