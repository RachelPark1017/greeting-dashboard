# Greeting ATS 채용 대시보드 설계 문서

**날짜:** 2026-03-11
**상태:** 확정

## 개요

Greeting ATS API를 연동하여 채용팀과 채용팀장이 채용 현황을 한눈에 파악할 수 있는 내부 대시보드.

## 사용자

- 채용팀 담당자
- 채용팀장

## 기능 요구사항

### 1. KPI 요약 카드 (상단)
- 진행 중인 공고 수
- 이번 달 총 지원자 수
- 합격자 수
- 평균 채용 소요일

### 2. 채용 파이프라인 (중단)
- 공고별 전형 단계(서류접수 → 서류검토 → 면접 → 최종합격) 지원자 수 표시
- 테이블 형태로 공고 목록과 단계별 현황 제공

### 3. 지원자 트래킹 테이블 (하단 좌)
- 지원자 이름 / 지원 공고 / 현재 단계 / 지원일 / 상태
- 검색 및 필터 기능 (공고별, 상태별)

### 4. 성과 분석 차트 (하단 우)
- 공고별 지원자 수 막대 차트
- 전형 단계별 통과율 퍼널 차트

### 5. 데이터 갱신
- 5분마다 자동 갱신
- 수동 새로고침 버튼

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | Vercel 배포 최적화, 서버사이드 API 키 보호 |
| 언어 | TypeScript | 타입 안전성 |
| 스타일 | Tailwind CSS | 빠른 UI 개발 |
| 차트 | Recharts | React 친화적, 가볍고 커스터마이즈 쉬움 |
| 배포 | Vercel | GitHub 연동 자동 배포 |

## 프로젝트 구조

```
greeting-dashboard/
├── app/
│   ├── api/
│   │   ├── postings/route.ts        # 공고 목록/상세
│   │   ├── applicants/route.ts      # 지원자 정보
│   │   └── analytics/route.ts       # 통계 집계
│   ├── page.tsx                     # 메인 대시보드
│   └── layout.tsx
├── components/
│   ├── KpiCards.tsx
│   ├── PipelineBoard.tsx
│   ├── ApplicantTable.tsx
│   └── AnalyticsCharts.tsx
├── lib/
│   └── greeting-api.ts              # Greeting API 클라이언트
└── .env.local                       # GREETING_API_KEY (서버 전용)
```

## Greeting API 매핑

| 화면 요소 | Greeting API 엔드포인트 |
|---|---|
| 공고 목록 | GET /openapi/v1/postings |
| 공고 상세 | GET /openapi/v3/postings/{id} |
| 지원자 정보 | GET /openapi/v2/applicants/{id} |
| 합격자 현황 | GET /openapi/v1/passed-applicants |

## 보안

- API 키는 서버사이드(Next.js Route Handler)에서만 사용
- 브라우저에 API 키 노출 없음
- 환경변수: `GREETING_API_KEY`

## 배포

- GitHub 저장소 생성 → Vercel 연동
- `main` 브랜치 push 시 자동 배포
- Vercel 대시보드에서 환경변수 설정

## 접근 제어

- 별도 로그인 없음
- URL 아는 사람 누구나 접근 가능
