'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import type { ChannelStat, PassedApplicant } from '@/lib/types'

interface Props {
  channelStats: ChannelStat[]
  passedApplicants: PassedApplicant[]
}

const CHANNEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
}

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

export default function ChannelTab({ channelStats, passedApplicants }: Props) {
  // 채널 트렌드 (월별 상위 3개 채널)
  const top3Channels = channelStats.slice(0, 3).map((c) => c.channel)
  const now = new Date()
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}월`
    const start = `${monthStr}-01`
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`

    const entry: Record<string, string | number> = { month: label }
    top3Channels.forEach((ch) => {
      entry[ch] = passedApplicants.filter(
        (a) => normalizeReferer(a.referer) === ch && a.passDate >= start && a.passDate <= end,
      ).length
    })
    return entry
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 채널별 합격 비교 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-zinc-900">채널별 합격자</h3>
            <p className="text-sm text-zinc-500 mt-1">채널별 합격자 수 비교</p>
          </div>
          <div className="p-6 pt-2">
            {channelStats.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={channelStats} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="합격자" radius={[4, 4, 0, 0]}>
                    {channelStats.map((_, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 채널 트렌드 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-zinc-900">채널 트렌드</h3>
            <p className="text-sm text-zinc-500 mt-1">월별 상위 3개 채널 추이</p>
          </div>
          <div className="p-6 pt-2">
            {top3Channels.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  {top3Channels.map((ch, i) => (
                    <Line key={ch} type="monotone" dataKey={ch} stroke={CHANNEL_COLORS[i]} strokeWidth={2} dot={{ r: 4, fill: CHANNEL_COLORS[i], strokeWidth: 2, stroke: 'white' }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 채널별 상세 테이블 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-zinc-900">채널별 상세</h3>
          <p className="text-sm text-zinc-500 mt-1">채널별 합격자 수, 평균 점수, 평균 소요일</p>
        </div>
        <div className="px-6 pb-6">
          {channelStats.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="h-10 text-left font-medium text-zinc-500">채널</th>
                    <th className="h-10 text-right font-medium text-zinc-500">합격자 수</th>
                    <th className="h-10 text-right font-medium text-zinc-500">평균 점수</th>
                    <th className="h-10 text-right font-medium text-zinc-500">평균 소요일</th>
                  </tr>
                </thead>
                <tbody>
                  {channelStats.map((c) => (
                    <tr key={c.channel} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="py-3 font-medium text-zinc-800">{c.channel}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-2 text-xs font-medium text-white">
                          {c.count}
                        </span>
                      </td>
                      <td className="py-3 text-right text-zinc-600">{c.avgScore !== null ? `${c.avgScore}점` : '-'}</td>
                      <td className="py-3 text-right text-zinc-600">{c.avgDays !== null ? `${c.avgDays}일` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
