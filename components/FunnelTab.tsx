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
  Cell,
} from 'recharts'
import type { PassedApplicant, OpeningWithPassedCount } from '@/lib/types'

interface Props {
  passedApplicants: PassedApplicant[]
  openings: OpeningWithPassedCount[]
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
}

export default function FunnelTab({ passedApplicants, openings }: Props) {
  const [search, setSearch] = useState('')
  const [filterOpening, setFilterOpening] = useState('')

  // 공고별 리드타임
  const openingLeadTime = openings
    .map((o) => {
      const applicants = passedApplicants.filter((a) => a.openingId === o.id && a.submitDate && a.passDate)
      const days = applicants
        .map((a) => Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24)))
        .filter((d) => d >= 0)
      const avg = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null
      return {
        name: o.title.length > 12 ? o.title.slice(0, 12) + '...' : o.title,
        fullName: o.title,
        avgDays: avg,
      }
    })
    .filter((o) => o.avgDays !== null)
    .sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))

  const allDays = passedApplicants
    .filter((a) => a.submitDate && a.passDate)
    .map((a) => Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d) => d >= 0)
  const overallAvgDays = allDays.length > 0 ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : null

  // 합격자 목록 필터
  const openingOptions = Array.from(
    new Map(passedApplicants.map((a) => [a.openingId, a.openingTitle])).entries(),
  )

  const filtered = passedApplicants.filter((a) => {
    const matchSearch =
      search === '' || a.name.includes(search) || a.email.includes(search)
    const matchOpening =
      filterOpening === '' || String(a.openingId) === filterOpening
    return matchSearch && matchOpening
  })

  return (
    <div className="space-y-6">
      {/* 리드타임 분석 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">리드타임 분석</h3>
                <p className="text-sm text-zinc-500 mt-1">공고별 평균 채용 소요일</p>
              </div>
              {overallAvgDays !== null && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-zinc-900">{overallAvgDays}일</p>
                  <p className="text-xs text-zinc-400">전체 평균</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 pt-2">
            {openingLeadTime.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, openingLeadTime.length * 44)}>
                <BarChart data={openingLeadTime} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} unit="일" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}일`, '평균 소요일']} />
                  <Bar dataKey="avgDays" name="평균 소요일" radius={[0, 4, 4, 0]} barSize={20}>
                    {openingLeadTime.map((entry, i) => (
                      <Cell key={i} fill={(entry.avgDays ?? 0) >= (overallAvgDays ?? 999) ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      {/* 합격자 목록 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-zinc-900">합격자 목록</h3>
          <p className="text-sm text-zinc-500 mt-1">총 {filtered.length}명</p>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="이름 또는 이메일 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 pl-8 py-1 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
            <select
              value={filterOpening}
              onChange={(e) => setFilterOpening(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            >
              <option value="">전체 공고</option>
              {openingOptions.map(([id, title]) => (
                <option key={id} value={String(id)}>{title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="h-10 text-left font-medium text-zinc-500">이름</th>
                  <th className="h-10 text-left font-medium text-zinc-500">공고</th>
                  <th className="h-10 text-left font-medium text-zinc-500">합격일</th>
                  <th className="h-10 text-right font-medium text-zinc-500">소요일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-zinc-400">
                      검색 결과가 없습니다
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const days = a.submitDate && a.passDate
                      ? Math.round((new Date(a.passDate).getTime() - new Date(a.submitDate).getTime()) / (1000 * 60 * 60 * 24))
                      : null
                    return (
                      <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                              {a.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-zinc-800">{a.name}</p>
                              <p className="text-xs text-zinc-400 mt-0.5 truncate">{a.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600 max-w-[160px] truncate">
                            {a.openingTitle}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-500 whitespace-nowrap">
                          {new Date(a.passDate).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-3 text-right text-zinc-500">
                          {days !== null && days >= 0 ? `${days}일` : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
