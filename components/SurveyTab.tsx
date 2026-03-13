'use client'

import type { SurveyAggregated, SurveyQuestion } from '@/lib/types'

interface Props {
  surveys: SurveyAggregated[]
}

function NpsGauge({ score, distribution }: { score: number; distribution: NonNullable<SurveyQuestion['npsDistribution']> }) {
  const total = distribution.promoters + distribution.passives + distribution.detractors
  const color = score >= 50 ? 'text-emerald-600' : score >= 0 ? 'text-amber-500' : 'text-red-500'
  return (
    <div className="flex items-center gap-4">
      <span className={`text-3xl font-bold ${color}`}>{score}</span>
      <div className="text-xs text-zinc-500 space-y-0.5">
        <p>추천 {distribution.promoters}명 · 중립 {distribution.passives}명 · 비추천 {distribution.detractors}명</p>
        <p className="text-zinc-400">총 {total}명 응답</p>
      </div>
    </div>
  )
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
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">{survey.formTitle}</h3>
              <p className="text-sm text-zinc-500 mt-0.5">{survey.totalResponses}명 응답 / {survey.targetCount}명 대상</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-900">{survey.responseRate.toFixed(0)}%</p>
              <p className="text-xs text-zinc-400">응답률</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* 점수형 질문들 */}
            {survey.questions.filter((q) => q.type === 'score').length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">항목별 평균 점수</p>
                <div className="space-y-2">
                  {survey.questions.filter((q) => q.type === 'score').map((q) => (
                    <div key={q.questionTitle} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                      <span className="text-sm text-zinc-700">{q.questionTitle}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${((q.avgScore ?? 0) / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 w-8 text-right">{q.avgScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 주관식 답변 */}
            {survey.questions.filter((q) => q.type === 'text').map((q) => (
              <div key={q.questionTitle}>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">주관식 답변</p>
                <p className="text-sm font-medium text-zinc-700 mb-2">{q.questionTitle}</p>
                <ul className="space-y-1.5">
                  {(q.textAnswers ?? []).map((t, i) => (
                    <li key={i} className="text-sm text-zinc-600 pl-3 border-l-2 border-zinc-200">{t}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* NPS */}
            {survey.questions.filter((q) => q.type === 'nps').map((q) => (
              <div key={q.questionTitle}>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">NPS (추천 지수)</p>
                <p className="text-sm text-zinc-600 mb-2">{q.questionTitle}</p>
                {q.npsDistribution && <NpsGauge score={q.npsScore ?? 0} distribution={q.npsDistribution} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
