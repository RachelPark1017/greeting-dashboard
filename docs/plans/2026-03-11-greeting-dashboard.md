# Greeting ATS 채용 대시보드 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Greeting ATS API를 연동해 채용팀이 공고 현황, 합격자 트래킹, 채용 성과를 한눈에 볼 수 있는 Next.js 대시보드를 만든다.

**Architecture:** Next.js App Router를 사용해 API Route Handler가 서버사이드에서 Greeting API를 호출하고, 클라이언트 컴포넌트가 내부 API를 폴링해 데이터를 표시한다. API 키는 서버 환경변수에만 존재한다.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Vercel

**API 제약 사항:**
- Greeting API는 전형 단계별 지원자 수를 제공하지 않음
- 파이프라인 섹션은 "공고별 합격자 수" 테이블로 대체
- 합격자(passed-applicants)가 핵심 데이터 소스

**Greeting API 정보:**
- Base URL: `https://oapi.greetinghr.com`
- Auth Header: `X-Greeting-OpenAPI: <apiKey>`
- 공고 목록: `GET /openapi/openings?page=0&pageSize=50` (X-Api-Version: 2.0 필요)
- 합격자 목록: `GET /openapi/passed-applicants?page=0&pageSize=100`

---

## Task 1: Next.js 프로젝트 초기 설정

**Files:**
- Create: `greeting-dashboard/` (프로젝트 루트)

**Step 1: Next.js 프로젝트 생성**

```bash
cd "C:\Users\A100000318\Desktop\claude code"
npx create-next-app@latest greeting-dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
cd greeting-dashboard
```

**Step 2: Recharts 설치**

```bash
npm install recharts
npm install --save-dev @types/node
```

**Step 3: 불필요한 기본 파일 정리**

`app/page.tsx`를 아래로 교체:
```tsx
export default function Home() {
  return <div>대시보드 준비 중</div>
}
```

`app/globals.css`에서 기본 CSS 변수 제거하고 아래만 남기기:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: .env.local 파일 생성**

```bash
# .env.local
GREETING_API_KEY=여기에_API_키_입력
```

**Step 5: 동작 확인**

```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 열면 "대시보드 준비 중" 텍스트 보이면 성공.

**Step 6: 커밋**

```bash
git add .
git commit -m "chore: Next.js 프로젝트 초기 설정"
```

---

## Task 2: Greeting API 타입 정의 및 클라이언트

**Files:**
- Create: `lib/greeting-api.ts`
- Create: `lib/types.ts`

**Step 1: 타입 파일 생성**

`lib/types.ts`:
```typescript
// 공통 페이지네이션 응답
export interface PaginatedResponse<T> {
  page: number
  pageSize: number
  totalCount: number
  totalPage: number
  hasPrev: boolean
  hasNext: boolean
  datas: T[]
}

export interface GreetingResponse<T> {
  success: boolean
  data: T
  message: string | null
  errorCode: string | null
}

// 공고
export interface Opening {
  id: number
  title: string
  dueDate: string | null
  url: string
  activatedAtCareerPage: boolean
  openingJobPositionInfo: {
    openingJobPositions: Array<{
      jobPositionField: { field: string } | null
      jobPositionOccupation: { occupation: string } | null
      jobPositionJob: { job: string } | null
      jobPositionPlace: { place: string } | null
      jobPositionCareer: { careerType: string } | null
      jobPositionEmployment: { employment: string } | null
    }>
  } | null
}

// 합격자
export interface PassedApplicant {
  id: number
  name: string
  email: string
  phone: string
  submitDate: string
  passDate: string
  score: number | null
  quickNote: string | null
  referer: string | null
  refererName: string | null
  openingId: number
  openingTitle: string
  desiredJobPositions: Array<{
    id: number
    priority: number
    field: string | null
    occupation: string | null
    job: string | null
    place: string | null
    career: string | null
    employment: string | null
  }>
}

// 대시보드용 집계 타입
export interface DashboardStats {
  activeOpeningsCount: number
  thisMonthPassedCount: number
  totalPassedCount: number
  avgDaysToHire: number | null
}

export interface OpeningWithPassedCount {
  id: number
  title: string
  dueDate: string | null
  passedCount: number
}
```

**Step 2: API 클라이언트 생성**

`lib/greeting-api.ts`:
```typescript
import type { GreetingResponse, PaginatedResponse, Opening, PassedApplicant } from './types'

const BASE_URL = 'https://oapi.greetinghr.com'

function getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const apiKey = process.env.GREETING_API_KEY
  if (!apiKey) throw new Error('GREETING_API_KEY 환경변수가 설정되지 않았습니다')
  return {
    'X-Greeting-OpenAPI': apiKey,
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
}

export async function fetchOpenings(page = 0, pageSize = 50): Promise<PaginatedResponse<Opening>> {
  const url = `${BASE_URL}/openapi/openings?page=${page}&pageSize=${pageSize}&status=OPEN`
  const res = await fetch(url, {
    headers: getHeaders({ 'X-Api-Version': '2.0' }),
    next: { revalidate: 300 }, // 5분 캐시
  })
  if (!res.ok) throw new Error(`공고 목록 조회 실패: ${res.status}`)
  const json: GreetingResponse<PaginatedResponse<Opening>> = await res.json()
  if (!json.success) throw new Error(json.message ?? '공고 목록 조회 실패')
  return json.data
}

export async function fetchPassedApplicants(
  page = 0,
  pageSize = 100,
  passDateGt?: string,
  passDateLt?: string
): Promise<PaginatedResponse<PassedApplicant>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (passDateGt) params.set('passDateGt', passDateGt)
  if (passDateLt) params.set('passDateLt', passDateLt)

  const res = await fetch(`${BASE_URL}/openapi/passed-applicants?${params}`, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`합격자 목록 조회 실패: ${res.status}`)
  const json: GreetingResponse<PaginatedResponse<PassedApplicant>> = await res.json()
  if (!json.success) throw new Error(json.message ?? '합격자 목록 조회 실패')
  return json.data
}
```

**Step 3: 타입 에러 없는지 확인**

```bash
npx tsc --noEmit
```
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add lib/
git commit -m "feat: Greeting API 클라이언트 및 타입 정의"
```

---

## Task 3: API Route Handlers (서버사이드 프록시)

**Files:**
- Create: `app/api/dashboard/route.ts`

**Step 1: 대시보드 데이터 통합 API Route 생성**

`app/api/dashboard/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { fetchOpenings, fetchPassedApplicants } from '@/lib/greeting-api'
import type { DashboardStats, OpeningWithPassedCount } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5분

export async function GET() {
  try {
    const [openingsData, passedData] = await Promise.all([
      fetchOpenings(0, 50),
      fetchPassedApplicants(0, 100),
    ])

    // 이번 달 합격자
    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const thisMonthPassed = passedData.datas.filter(
      (a) => a.passDate >= thisMonthStart
    )

    // 평균 채용 소요일
    const daysToHireList = passedData.datas
      .filter((a) => a.submitDate && a.passDate)
      .map((a) => {
        const submit = new Date(a.submitDate).getTime()
        const pass = new Date(a.passDate).getTime()
        return Math.round((pass - submit) / (1000 * 60 * 60 * 24))
      })
      .filter((d) => d >= 0)

    const avgDaysToHire =
      daysToHireList.length > 0
        ? Math.round(daysToHireList.reduce((a, b) => a + b, 0) / daysToHireList.length)
        : null

    // 공고별 합격자 수
    const passedByOpening: Record<number, number> = {}
    passedData.datas.forEach((a) => {
      passedByOpening[a.openingId] = (passedByOpening[a.openingId] ?? 0) + 1
    })

    const openingsWithCount: OpeningWithPassedCount[] = openingsData.datas.map((o) => ({
      id: o.id,
      title: o.title,
      dueDate: o.dueDate,
      passedCount: passedByOpening[o.id] ?? 0,
    }))

    const stats: DashboardStats = {
      activeOpeningsCount: openingsData.totalCount,
      thisMonthPassedCount: thisMonthPassed.length,
      totalPassedCount: passedData.totalCount,
      avgDaysToHire,
    }

    return NextResponse.json({
      stats,
      openings: openingsWithCount,
      passedApplicants: passedData.datas,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: API Route 동작 확인**

```bash
npm run dev
```
브라우저에서 `http://localhost:3000/api/dashboard` 열기.
- API 키가 설정된 경우: JSON 데이터 응답
- 미설정 경우: `{"error": "GREETING_API_KEY 환경변수가 설정되지 않았습니다"}` — 정상

**Step 3: 커밋**

```bash
git add app/api/
git commit -m "feat: 대시보드 API Route Handler 추가"
```

---

## Task 4: KPI 카드 컴포넌트

**Files:**
- Create: `components/KpiCards.tsx`

**Step 1: KPI 카드 컴포넌트 생성**

`components/KpiCards.tsx`:
```tsx
import type { DashboardStats } from '@/lib/types'

interface Props {
  stats: DashboardStats
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function KpiCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="진행 중인 공고"
        value={`${stats.activeOpeningsCount}건`}
      />
      <KpiCard
        label="이번 달 합격자"
        value={`${stats.thisMonthPassedCount}명`}
      />
      <KpiCard
        label="누적 합격자"
        value={`${stats.totalPassedCount}명`}
      />
      <KpiCard
        label="평균 채용 소요일"
        value={stats.avgDaysToHire !== null ? `${stats.avgDaysToHire}일` : '-'}
        sub="지원일 → 합격일 기준"
      />
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add components/KpiCards.tsx
git commit -m "feat: KPI 카드 컴포넌트 추가"
```

---

## Task 5: 공고별 합격자 현황 테이블

**Files:**
- Create: `components/OpeningsPipeline.tsx`

**Step 1: 공고 현황 테이블 컴포넌트 생성**

`components/OpeningsPipeline.tsx`:
```tsx
import type { OpeningWithPassedCount } from '@/lib/types'

interface Props {
  openings: OpeningWithPassedCount[]
}

export default function OpeningsPipeline({ openings }: Props) {
  if (openings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">진행 중인 공고</h2>
        <p className="text-gray-400 text-sm">진행 중인 공고가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        진행 중인 공고
        <span className="ml-2 text-sm font-normal text-gray-400">{openings.length}건</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 font-medium text-gray-500">공고명</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500">마감일</th>
              <th className="text-right py-2 font-medium text-gray-500">합격자 수</th>
            </tr>
          </thead>
          <tbody>
            {openings.map((opening) => (
              <tr key={opening.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium text-gray-800">{opening.title}</td>
                <td className="py-3 pr-4 text-gray-500">
                  {opening.dueDate
                    ? new Date(opening.dueDate).toLocaleDateString('ko-KR')
                    : '상시채용'}
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {opening.passedCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add components/OpeningsPipeline.tsx
git commit -m "feat: 공고 현황 테이블 컴포넌트 추가"
```

---

## Task 6: 합격자 목록 테이블

**Files:**
- Create: `components/ApplicantTable.tsx`

**Step 1: 합격자 테이블 컴포넌트 생성**

`components/ApplicantTable.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { PassedApplicant } from '@/lib/types'

interface Props {
  applicants: PassedApplicant[]
}

export default function ApplicantTable({ applicants }: Props) {
  const [search, setSearch] = useState('')
  const [filterOpening, setFilterOpening] = useState('')

  // 공고 목록 (중복 제거)
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

      {/* 필터 */}
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

      {/* 테이블 */}
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
```

**Step 2: 커밋**

```bash
git add components/ApplicantTable.tsx
git commit -m "feat: 합격자 목록 테이블 컴포넌트 추가"
```

---

## Task 7: 성과 분석 차트

**Files:**
- Create: `components/AnalyticsCharts.tsx`

**Step 1: 차트 컴포넌트 생성**

`components/AnalyticsCharts.tsx`:
```tsx
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
      {/* 공고별 합격자 수 */}
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

      {/* 월별 합격자 추이 */}
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
```

**Step 2: 커밋**

```bash
git add components/AnalyticsCharts.tsx
git commit -m "feat: 성과 분석 차트 컴포넌트 추가"
```

---

## Task 8: 메인 대시보드 페이지 조립

**Files:**
- Modify: `app/page.tsx`
- Create: `components/Dashboard.tsx`

**Step 1: 클라이언트 대시보드 컴포넌트 생성 (자동 갱신 포함)**

`components/Dashboard.tsx`:
```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCards from './KpiCards'
import OpeningsPipeline from './OpeningsPipeline'
import ApplicantTable from './ApplicantTable'
import AnalyticsCharts from './AnalyticsCharts'
import type { DashboardStats, OpeningWithPassedCount, PassedApplicant } from '@/lib/types'

interface DashboardData {
  stats: DashboardStats
  openings: OpeningWithPassedCount[]
  passedApplicants: PassedApplicant[]
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5분

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">데이터 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">채용 대시보드</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            새로고침
          </button>
        </div>

        {/* KPI 카드 */}
        <div className="mb-6">
          <KpiCards stats={data.stats} />
        </div>

        {/* 공고 현황 */}
        <div className="mb-6">
          <OpeningsPipeline openings={data.openings} />
        </div>

        {/* 합격자 테이블 + 차트 */}
        <div className="mb-6">
          <AnalyticsCharts passedApplicants={data.passedApplicants} />
        </div>

        <div className="mb-6">
          <ApplicantTable applicants={data.passedApplicants} />
        </div>
      </div>
    </main>
  )
}
```

**Step 2: 메인 페이지 업데이트**

`app/page.tsx`:
```tsx
import Dashboard from '@/components/Dashboard'

export default function Home() {
  return <Dashboard />
}
```

**Step 3: 동작 확인**

```bash
npm run dev
```
`http://localhost:3000` 접속해서 대시보드 화면 확인.
- API 키 미설정 시: 에러 메시지 + 다시 시도 버튼 표시
- API 키 설정 시: 전체 대시보드 표시

**Step 4: TypeScript 에러 확인**

```bash
npx tsc --noEmit
```
Expected: 에러 없음

**Step 5: 커밋**

```bash
git add app/page.tsx components/Dashboard.tsx
git commit -m "feat: 메인 대시보드 페이지 조립 및 자동 갱신 구현"
```

---

## Task 9: Vercel 배포

**Step 1: GitHub 저장소 생성 및 push**

GitHub.com에서 `greeting-dashboard` 이름으로 새 저장소 생성 (Private 권장).

```bash
git remote add origin https://github.com/<내-아이디>/greeting-dashboard.git
git branch -M main
git push -u origin main
```

**Step 2: .gitignore에 .env.local 확인**

`cat .gitignore`에서 `.env.local`이 포함되어 있는지 확인.
Next.js 기본 `.gitignore`에는 이미 포함되어 있음.

**Step 3: Vercel 연동**

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. "Add New Project" → `greeting-dashboard` 저장소 선택
3. Framework Preset: Next.js (자동 감지)
4. **Environment Variables** 섹션에서 추가:
   - Key: `GREETING_API_KEY`
   - Value: Greeting에서 발급받은 API 키
5. "Deploy" 클릭

배포 완료 후 `https://greeting-dashboard-xxxx.vercel.app` 형태의 URL 발급.

**Step 4: 배포 확인**

발급된 URL로 접속해서 대시보드가 정상 표시되는지 확인.

---

## 완료 기준

- [ ] `http://localhost:3000` 에서 대시보드 정상 표시
- [ ] KPI 4개 카드 (공고 수, 이번 달 합격자, 누적 합격자, 평균 소요일)
- [ ] 진행 중인 공고 테이블 (공고명, 마감일, 합격자 수)
- [ ] 합격자 테이블 (검색/필터 동작)
- [ ] 막대 차트 + 라인 차트 표시
- [ ] 5분 자동 갱신 + 수동 새로고침 버튼
- [ ] Vercel 배포 URL 접속 가능
- [ ] API 키가 브라우저 네트워크 탭에 노출되지 않음
