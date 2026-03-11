'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import KpiCards from './KpiCards'
import type { DashboardStats, MonthlyTrend, ChannelStat, OpeningDetail } from '@/lib/types'

interface Props {
  stats: DashboardStats
  monthlyTrend: MonthlyTrend[]
  channelStats: ChannelStat[]
  openingDetails: OpeningDetail[]
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
}

export default function OverviewTab({ stats, monthlyTrend, channelStats, openingDetails }: Props) {
  return (
    <div className="space-y-6">
      <KpiCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 합격 추이 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-zinc-900">월별 합격 추이</h3>
            <p className="text-sm text-zinc-500 mt-1">최근 6개월</p>
          </div>
          <div className="p-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="passed" name="합격" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 지원 경로 분포 */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-zinc-900">지원 경로 분포</h3>
            <p className="text-sm text-zinc-500 mt-1">채널별 합격자 비율</p>
          </div>
          <div className="p-6 pt-2">
            {channelStats.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={channelStats}
                    dataKey="count"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={12}
                  >
                    {channelStats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 진행 중 공고 현황 테이블 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-zinc-900">진행 중 공고 현황</h3>
          <p className="text-sm text-zinc-500 mt-1">{openingDetails.length}건의 공고가 진행 중입니다</p>
        </div>
        <div className="px-6 pb-6">
          {openingDetails.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">진행 중인 공고가 없습니다</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="h-10 text-left font-medium text-zinc-500">공고명</th>
                    <th className="h-10 text-left font-medium text-zinc-500">직군</th>
                    <th className="h-10 text-left font-medium text-zinc-500">유형</th>
                    <th className="h-10 text-right font-medium text-zinc-500">합격자</th>
                  </tr>
                </thead>
                <tbody>
                  {openingDetails.map((d) => (
                    <tr key={d.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="py-3 font-medium text-zinc-800">{d.title}</td>
                      <td className="py-3 text-zinc-600">{d.field ?? '-'}</td>
                      <td className="py-3 text-zinc-600">{d.career ?? '-'}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-2 text-xs font-medium text-white">
                          {d.passedCount}
                        </span>
                      </td>
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
