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
