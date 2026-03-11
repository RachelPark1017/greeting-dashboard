'use client'

import { useState } from 'react'
import type { PassedApplicant } from '@/lib/types'

interface Props {
  applicants: PassedApplicant[]
}

export default function ApplicantTable({ applicants }: Props) {
  const [search, setSearch] = useState('')
  const [filterOpening, setFilterOpening] = useState('')

  const openingOptions = Array.from(
    new Map(applicants.map((a) => [a.openingId, a.openingTitle])).entries()
  )

  const filtered = applicants.filter((a) => {
    const matchSearch =
      search === '' ||
      a.name.includes(search) ||
      a.email.includes(search)
    const matchOpening =
      filterOpening === '' || String(a.openingId) === filterOpening
    return matchSearch && matchOpening
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">합격자 목록</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterOpening}
          onChange={(e) => setFilterOpening(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 공고</option>
          {openingOptions.map(([id, title]) => (
            <option key={id} value={String(id)}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 font-medium text-gray-500">이름</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500">지원 공고</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500">지원일</th>
              <th className="text-left py-2 font-medium text-gray-500">합격일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-800">{a.name}</td>
                  <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">
                    {a.openingTitle}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {new Date(a.submitDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(a.passDate).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">총 {filtered.length}명</p>
    </div>
  )
}
