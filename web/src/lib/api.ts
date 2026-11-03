const API_BASE = '/api'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data as T
}

export type Home = {
  id: string
  name: string
}

export type Member = {
  id: string
  homeId: string
  name: string
}

export type Share = {
  id: string
  memberId: string
  amountCents: number
  paidAt: string | null
}

export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}

export type Balance = {
  memberId: string
  name: string
  outstandingCents: number
}

export type HomeDetails = {
  home: Home
  members: Member[]
  bills: Array<{
    id: string
    homeId: string
    title: string
    totalCents: number
    shareId: string
    memberId: string
    amountCents: number
    paidAt: string | null
  }>
}

export const api = {
  createHome: (name: string) =>
    request<Home>('/homes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getHome: (homeId: string) => request<HomeDetails>(`/homes/${homeId}`),

  addMember: (homeId: string, name: string) =>
    request<Member>(`/homes/${homeId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Bill>(`/homes/${homeId}/bills`, {
      method: 'POST',
      body: JSON.stringify({ title, totalCents }),
    }),

  payShare: (billId: string, shareId: string, idempotencyKey: string) =>
    request<Share>(`/bills/${billId}/shares/${shareId}/pay`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  getBalances: (homeId: string) => request<{ balances: Balance[] }>(`/homes/${homeId}/balances`),
}
