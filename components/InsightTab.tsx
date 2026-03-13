'use client'

import { useMemo } from 'react'
import type { DashboardStats, MonthlyTrend, ChannelStat, OpeningDetail, PassedApplicant } from '@/lib/types'

interface Props {
  stats: DashboardStats
  monthlyTrend: MonthlyTrend[]
  channelStats: ChannelStat[]
  openingDetails: OpeningDetail[]
  passedApplicants: PassedApplicant[]
}

function computeInsights(props: Props) {
  const { stats, monthlyTrend, channelStats, openingDetails, passedApplicants } = props

  // 전월 대비 증감
  const currentMonth = monthlyTrend[monthlyTrend.length - 1]?.passed ?? 0
  const prevMonth = monthlyTrend[monthlyTrend.length - 2]?.passed ?? 0
  const momChange = prevMonth > 0 ? Math.round(((currentMonth - prevMonth) / prevMonth) * 100) : null
  const trendDirection = momChange === null ? '비교 불가' : momChange > 0 ? '증가' : momChange < 0 ? '감소' : '유지'

  // 6개월 추이 방향
  const firstHalf = monthlyTrend.slice(0, 3).reduce((s, m) => s + m.passed, 0)
  const secondHalf = monthlyTrend.slice(3).reduce((s, m) => s + m.passed, 0)
  const overallTrend = secondHalf > firstHalf * 1.2 ? '상승세' : secondHalf < firstHalf * 0.8 ? '하락세' : '안정세'

  // 채용 속도 평가
  const speedLabel = stats.avgDaysToHire === null ? '-' : stats.avgDaysToHire <= 20 ? '빠름' : stats.avgDaysToHire <= 40 ? '보통' : '느림'

  // 채널 분석
  const sortedChannels = [...channelStats].sort((a, b) => b.count - a.count)
  const fastestChannel = [...channelStats].filter((c) => c.avgDays !== null).sort((a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999))[0]
  const highestScoreChannel = [...channelStats].filter((c) => c.avgScore !== null).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0]

  // 공고별 현황
  const noHireOpenings = openingDetails.filter((o) => o.passedCount === 0)
  const topOpening = [...openingDetails].sort((a, b) => b.passedCount - a.passedCount)[0]

  // 채용 소요일 분포
  const daysList = passedApplicants
    .filter((a) => a.submitDate && a.passDate)
    .map((a) => Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d) => d >= 0)
  const medianDays = daysList.length > 0 ? daysList.sort((a, b) => a - b)[Math.floor(daysList.length / 2)] : null

  return {
    momChange,
    trendDirection,
    overallTrend,
    speedLabel,
    sortedChannels,
    fastestChannel,
    highestScoreChannel,
    noHireOpenings,
    topOpening,
    medianDays,
    currentMonth,
    prevMonth,
  }
}

export default function InsightTab(props: Props) {
  const { stats, monthlyTrend } = props
  const insights = useMemo(() => computeInsights(props), [props])

  return (
    <div className="space-y-6">
      {/* 채용 실적 요약 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">채용 실적 요약</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="이번 달 합격자" value={`${stats.thisMonthPassedCount}명`} sub={
              insights.momChange !== null ? `전월 대비 ${insights.momChange > 0 ? '+' : ''}${insights.momChange}%` : undefined
            } subColor={insights.momChange !== null ? (insights.momChange >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined} />
            <MetricCard label="누적 합격자" value={`${stats.totalPassedCount}명`} />
            <MetricCard label="평균 채용 소요일" value={stats.avgDaysToHire !== null ? `${stats.avgDaysToHire}일` : '-'} sub={insights.speedLabel !== '-' ? insights.speedLabel : undefined}
              subColor={insights.speedLabel === '빠름' ? 'text-emerald-600' : insights.speedLabel === '느림' ? 'text-red-500' : 'text-amber-500'} />
            <MetricCard label="중앙값 소요일" value={insights.medianDays !== null ? `${insights.medianDays}일` : '-'} />
          </div>
        </div>
      </div>

      {/* 월별 트렌드 요약 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-zinc-900">월별 트렌드</h3>
            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
              insights.overallTrend === '상승세' ? 'bg-emerald-50 text-emerald-700' :
              insights.overallTrend === '하락세' ? 'bg-red-50 text-red-700' :
              'bg-zinc-100 text-zinc-700'
            }`}>
              {insights.overallTrend === '상승세' ? '↑' : insights.overallTrend === '하락세' ? '↓' : '→'} {insights.overallTrend}
            </span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {monthlyTrend.map((m) => {
              const max = Math.max(...monthlyTrend.map((t) => t.passed), 1)
              const height = (m.passed / max) * 100
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-zinc-700">{m.passed}</span>
                  <div className="w-full rounded-t bg-zinc-800" style={{ height: `${Math.max(height, 4)}%` }} />
                  <span className="text-xs text-zinc-400">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 채널 효과 분석 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">채널 효과 분석</h3>
            <div className="space-y-3">
              {insights.sortedChannels.map((ch, i) => (
                <div key={ch.channel} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-zinc-100 text-xs flex items-center justify-center font-medium text-zinc-600">{i + 1}</span>
                    <span className="text-sm font-medium text-zinc-900">{ch.channel}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-900">{ch.count}명</span>
                    {ch.avgScore !== null && <span>평균 {ch.avgScore}점</span>}
                    {ch.avgDays !== null && <span>{ch.avgDays}일</span>}
                  </div>
                </div>
              ))}
            </div>
            {(insights.fastestChannel || insights.highestScoreChannel) && (
              <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1">
                {insights.fastestChannel && (
                  <p className="text-xs text-zinc-500">
                    가장 빠른 채널: <span className="font-medium text-zinc-700">{insights.fastestChannel.channel}</span> (평균 {insights.fastestChannel.avgDays}일)
                  </p>
                )}
                {insights.highestScoreChannel && (
                  <p className="text-xs text-zinc-500">
                    최고 점수 채널: <span className="font-medium text-zinc-700">{insights.highestScoreChannel.channel}</span> (평균 {insights.highestScoreChannel.avgScore}점)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 공고별 현황 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">공고별 현황</h3>
            {insights.topOpening && (
              <div className="mb-3 rounded-md bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">가장 활발한 공고</p>
                <p className="text-sm font-medium text-zinc-900 mt-0.5">{insights.topOpening.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{insights.topOpening.passedCount}명 합격</p>
              </div>
            )}
            {insights.noHireOpenings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-2">합격자 없는 공고 ({insights.noHireOpenings.length}건)</p>
                <ul className="space-y-1">
                  {insights.noHireOpenings.map((o) => (
                    <li key={o.id} className="text-sm text-zinc-600 pl-3 border-l-2 border-red-200">{o.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {insights.noHireOpenings.length === 0 && (
              <p className="text-sm text-zinc-500">모든 공고에서 합격자가 발생했습니다.</p>
            )}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <p className="text-xs text-zinc-500">활성 공고 총 <span className="font-medium text-zinc-700">{stats.activeOpeningsCount}건</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold text-zinc-900 mt-1">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-zinc-500'}`}>{sub}</p>}
    </div>
  )
}
