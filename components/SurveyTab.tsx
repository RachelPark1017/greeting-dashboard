'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
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
import type { AllSurveyData, SurveyStats } from '@/lib/types'

interface Props {
  data: AllSurveyData
}

const SUB_TABS = [
  { key: 'interview1' as const, label: '1차 면접' },
  { key: 'interview2' as const, label: '2차 면접' },
  { key: 'coffeechat' as const, label: '커피챗' },
]

type SubTabKey = 'interview1' | 'interview2' | 'coffeechat'

const NPS_COLORS = ['#10b981', '#f59e0b', '#ef4444']
const BAR_COLOR = '#3b82f6'
const HORIZONTAL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function ScoreBarChart({ data, title }: { data: number[]; title: string }) {
  const chartData = data.map((count, i) => ({ label: `${i + 1}점`, count }))
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="p-5 pb-2">
        <h4 className="text-sm font-semibold text-zinc-800">{title}</h4>
      </div>
      <div className="p-5 pt-1">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="응답 수" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function NpsPieChart({ promoters, passives, detractors }: { promoters: number; passives: number; detractors: number }) {
  const total = promoters + passives + detractors
  const pieData = [
    { name: `추천 (9-10점) ${total > 0 ? Math.round((promoters / total) * 100) : 0}%`, value: promoters },
    { name: `중립 (7-8점) ${total > 0 ? Math.round((passives / total) * 100) : 0}%`, value: passives },
    { name: `비추천 (0-6점) ${total > 0 ? Math.round((detractors / total) * 100) : 0}%`, value: detractors },
  ].filter((d) => d.value > 0)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="p-5 pb-2">
        <h4 className="text-sm font-semibold text-zinc-800">NPS 구성</h4>
        <p className="text-xs text-zinc-400 mt-0.5">추천/중립/비추천 비율</p>
      </div>
      <div className="p-5 pt-1">
        {total === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={NPS_COLORS[i % NPS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function HorizontalBarChart({ data, title }: { data: { label: string; count: number }[]; title: string }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="p-5 pb-2">
        <h4 className="text-sm font-semibold text-zinc-800">{title}</h4>
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        {data.slice(0, 10).map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-zinc-600 truncate" title={item.label}>{item.label}</span>
            <div className="flex-1 h-5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: HORIZONTAL_COLORS[i % HORIZONTAL_COLORS.length],
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-xs font-medium text-zinc-700 text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentsList({ comments }: { comments: SurveyStats['comments'] }) {
  if (comments.length === 0) return null

  function npsColor(nps: number | null) {
    if (nps === null) return 'bg-zinc-100 text-zinc-500'
    if (nps >= 9) return 'bg-emerald-50 text-emerald-700'
    if (nps >= 7) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="p-5 pb-2">
        <h4 className="text-sm font-semibold text-zinc-800">자유 응답</h4>
        <p className="text-xs text-zinc-400 mt-0.5">{comments.length}건의 코멘트</p>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {comments.map((c, i) => (
          <div key={i} className="rounded-md border border-zinc-100 bg-zinc-50 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-zinc-700">{c.name}</span>
              <span className="text-xs text-zinc-400">{c.job}</span>
              {c.nps !== null && (
                <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${npsColor(c.nps)}`}>
                  NPS {c.nps}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">{c.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SurveyPanel({ stats, type }: { stats: SurveyStats; type: SubTabKey }) {
  const npsLabel =
    stats.nps >= 50 ? '우수' : stats.nps >= 0 ? '보통' : '개선 필요'

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="총 응답 수" value={`${stats.totalCount}명`} />
        <KpiCard
          label="NPS"
          value={`${stats.nps}`}
          sub={npsLabel}
        />
        <KpiCard
          label="평균 면접 경험"
          value={stats.avgExperience !== null ? `${stats.avgExperience}점` : '-'}
          sub="1-5점 척도"
        />
        <KpiCard
          label="평균 안내 충분성"
          value={stats.avgGuidance !== null ? `${stats.avgGuidance}점` : '-'}
          sub="1-5점 척도"
        />
        <KpiCard
          label={type === 'interview2' ? '평균 편의성' : '평균 난이도'}
          value={
            type === 'interview2'
              ? stats.avgConvenience !== null ? `${stats.avgConvenience}점` : '-'
              : stats.avgDifficulty !== null ? `${stats.avgDifficulty}점` : '-'
          }
          sub="1-5점 척도"
        />
      </div>

      {/* NPS + 점수 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NpsPieChart
          promoters={stats.promoters}
          passives={stats.passives}
          detractors={stats.detractors}
        />
        <ScoreBarChart data={stats.experienceDistribution} title="면접 경험 분포" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ScoreBarChart data={stats.guidanceDistribution} title="안내 충분성 분포" />
        {type === 'interview2'
          ? <ScoreBarChart data={stats.difficultyDistribution} title="편의성 분포 (난이도 대체)" />
          : <ScoreBarChart data={stats.difficultyDistribution} title="난이도 분포" />
        }
      </div>

      {/* 태그 차트 (1차, 커피챗만) */}
      {type === 'interview1' && stats.cultureTags.length > 0 && (
        <HorizontalBarChart data={stats.cultureTags} title="분위기 태그" />
      )}
      {type === 'coffeechat' && stats.satisfactionFactors.length > 0 && (
        <HorizontalBarChart data={stats.satisfactionFactors} title="만족 요인" />
      )}

      {/* 코멘트 */}
      <CommentsList comments={stats.comments} />
    </div>
  )
}

export default function SurveyTab({ data }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('interview1')

  const stats = data[activeSubTab]

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation */}
      <div className="flex gap-1 border-b border-zinc-200">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSubTab === tab.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SurveyPanel stats={stats} type={activeSubTab} />
    </div>
  )
}
