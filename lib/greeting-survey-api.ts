const WORKSPACE = 15598
const FORM_IDS = { interview1: 2936, interview2: 2938, coffeechat: 3780 }

export async function getAuthToken(): Promise<string> {
  const email = process.env.GREETING_EMAIL
  const passwordHash = process.env.GREETING_PASSWORD_HASH
  if (!email || !passwordHash) throw new Error('GREETING_EMAIL 또는 GREETING_PASSWORD_HASH 환경변수가 없습니다')

  const res = await fetch('https://api.greetinghr.com/authn/login/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, platform: 'WEB', password: passwordHash }),
  })
  const json = await res.json()
  if (!json.success) throw new Error('그리팅 로그인 실패: ' + json.message)
  return `Bearer ${json.data.accessToken}`
}

export async function fetchFormResponses(token: string, formId: number): Promise<
  { name: string; jobTitle: string; submitDate: string; answers: { questionId: number; value: unknown }[] }[]
> {
  const listRes = await fetch(
    `https://api.greetinghr.com/ats/api/forms/v1.0/workspaces/${WORKSPACE}/forms/${formId}/responses?page=0&pageSize=200&sorts=SUBMIT_DATE_DESC&status=SUBMITTED`,
    { headers: { Authorization: token } }
  )
  const listJson = await listRes.json()
  const items: {
    respondent: { name: string; category: string }
    response: { id: number | string; submitDate: string }
  }[] = listJson.data?.datas || []

  const results = await Promise.all(
    items.map(async (item) => {
      const detailRes = await fetch(
        `https://api.greetinghr.com/ats/api/forms/v1.0/workspaces/${WORKSPACE}/forms/${formId}/responses/${item.response.id}`,
        { headers: { Authorization: token } }
      )
      const detail = await detailRes.json()
      return {
        name: item.respondent.name,
        jobTitle: item.respondent.category,
        submitDate: item.response.submitDate,
        answers: detail.data?.answers || [],
      }
    })
  )
  return results
}

export { FORM_IDS }
