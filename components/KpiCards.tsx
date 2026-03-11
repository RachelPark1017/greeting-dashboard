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
