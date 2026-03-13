'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SurveyAggregated } from '@/lib/types'

interface Props {
  surveys: SurveyAggregated[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
}

export default function SurveyTab({ surveys }: Props) {
  if (surveys.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm p-8 text-center">
        <p className="text-sm text-zinc-400">설문 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {surveys.map((survey) => (
        <div key={survey.formTitle} className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2 border-b border-zinc-100">
            <h3 className="text-base font-semibold text-zinc-900">{survey.formTitle}</h3>
            <p className="text-sm text-zinc-500 mt-1">총 {survey.totalResponses}명 응답</p>
          </div>

          <div className="p-6 space-y-8">
            {survey.questions.map((q) => (
              <div key={q.questionTitle}>
                <p className="text-sm font-medium text-zinc-700 mb-3">{q.questionTitle}</p>
                <ResponsiveContainer width="100%" height={40 + q.answerDistribution.length * 36}>
                  <BarChart
                    data={q.answerDistribution}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="answer"
                      tick={{ fontSize: 12, fill: '#3f3f46' }}
                      width={140}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="응답 수" radius={[0, 4, 4, 0]}>
                      {q.answerDistribution.map((_, i) => (
                        <rect key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
