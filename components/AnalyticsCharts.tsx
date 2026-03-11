'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import type { PassedApplicant } from '@/lib/types'

interface Props {
  passedApplicants: PassedApplicant[]
}

export default function AnalyticsCharts({ passedApplicants }: Props) {
  // 공고별 합격자 수 (상위 10개)
  const byOpening: Record<string, number> = {}
  passedApplicants.forEach((a) => {
    const key = a.openingTitle.length > 15
      ? a.openingTitle.slice(0, 15) + '…'
      : a.openingTitle
    byOpening[key] = (byOpening[key] ?? 0) + 1
  })
  const openingChartData = Object.entries(byOpening)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 월별 합격자 수 (최근 6개월)
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = `${d.getMonth() + 1}월`
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`
    const count = passedApplicants.filter(
      (a) => a.passDate >= start && a.passDate <= end
    ).length
    return { label, count }
  })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">공고별 합격자 수</h2>
        {openingChartData.length === 0 ? (
          <p className="text-gray-400 text-sm">데이터가 없습니다</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={openingChartData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="합격자" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">월별 합격자 추이 (최근 6개월)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              name="합격자"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
