import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api, type Balance, type Bill, type Home, type HomeDetails, type Member } from '../lib/api'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function restoreBills(data: HomeDetails['bills']): Bill[] {
  const billMap = new Map<string, Bill>()

  for (const item of data) {
    if (!billMap.has(item.id)) {
      billMap.set(item.id, {
        id: item.id,
        homeId: item.homeId,
        title: item.title,
        totalCents: item.totalCents,
        shares: [],
      })
    }

    const bill = billMap.get(item.id)

    if (bill && item.shareId) {
      bill.shares.push({
        id: item.shareId,
        memberId: item.memberId,
        amountCents: item.amountCents,
        paidAt: item.paidAt,
      })
    }
  }

  return Array.from(billMap.values())
}

function HomePage() {
  const [home, setHome] = useState<Home | null>(null)
  const [homeName, setHomeName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [billTitle, setBillTitle] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function restoreHome() {
      const savedHomeId = localStorage.getItem('sharedBillHomeId')

      if (!savedHomeId) return

      setLoading(true)

      try {
        const result = await api.getHome(savedHomeId)
        setHome(result.home)
        setMembers(result.members)
        setBills(restoreBills(result.bills))
      } catch {
        localStorage.removeItem('sharedBillHomeId')
        setError('Unable to restore your home. Please create a new home.')
      } finally {
        setLoading(false)
      }
    }

    void restoreHome()
  }, [])

  async function createHome() {
    if (!homeName.trim()) return setError('Please enter a home name')

    setLoading(true)
    setError('')

    try {
      const result = await api.createHome(homeName.trim())
      setHome(result)
      localStorage.setItem('sharedBillHomeId', result.id)
      setHomeName('')
      setMessage('Home created successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create home')
    } finally {
      setLoading(false)
    }
  }

  async function addMember() {
    if (!home || !memberName.trim()) return

    setLoading(true)
    setError('')

    try {
      const result = await api.addMember(home.id, memberName.trim())
      setMembers((previous) => [...previous, result])
      setMemberName('')
      setMessage('Member added successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add member')
    } finally {
      setLoading(false)
    }
  }

  async function createBill() {
    if (!home || !billTitle.trim()) return setError('Please enter a bill title')

    const amount = Number(billAmount)

    if (!Number.isInteger(amount) || amount <= 0) {
      return setError('Enter a valid positive bill amount')
    }

    setLoading(true)
    setError('')

    try {
      const result = await api.createBill(home.id, billTitle.trim(), Math.round(amount * 100))

      setBills((previous) => [...previous, result])
      setBillTitle('')
      setBillAmount('')
      await loadBalances(home.id)
      setMessage('Bill created and split successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create bill')
    } finally {
      setLoading(false)
    }
  }

  async function loadBalances(homeId: string) {
    const result = await api.getBalances(homeId)
    setBalances(result.balances)
  }

  async function payShare(billId: string, shareId: string) {
    setLoading(true)
    setError('')

    try {
      await api.payShare(billId, shareId, crypto.randomUUID())

      setBills((previous) =>
        previous.map((bill) =>
          bill.id === billId
            ? {
                ...bill,
                shares: bill.shares.map((share) =>
                  share.id === shareId ? { ...share, paidAt: new Date().toISOString() } : share,
                ),
              }
            : bill,
        ),
      )

      if (home) await loadBalances(home.id)
      setMessage('Payment recorded successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!home) return

    let cancelled = false

    api
      .getBalances(home.id)
      .then((result) => {
        if (!cancelled) setBalances(result.balances)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load balances')
      })

    return () => {
      cancelled = true
    }
  }, [home])

  function formatMoney(cents: number) {
    return `₹${(cents / 100).toFixed(2)}`
  }

  const totalExpenses = bills.reduce((sum, bill) => sum + bill.totalCents, 0)

  const paidAmount = bills.reduce(
    (sum, bill) =>
      sum +
      bill.shares.reduce((shareSum, share) => shareSum + (share.paidAt ? share.amountCents : 0), 0),
    0,
  )

  const pendingAmount = bills.reduce(
    (sum, bill) =>
      sum +
      bill.shares.reduce(
        (shareSum, share) => shareSum + (!share.paidAt ? share.amountCents : 0),
        0,
      ),
    0,
  )

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">₹</div>
          <span>SplitSmart</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          <a href="#dashboard" className="nav-link active">
            <span>▦</span> Dashboard
          </a>
          <a href="#members" className="nav-link">
            <span>♙</span> Members
          </a>
          <a href="#create-bill" className="nav-link">
            <span>＋</span> Create Bill
          </a>
          <a href="#bills" className="nav-link">
            <span>▤</span> Transactions
          </a>
          <a href="#balances" className="nav-link">
            <span>◈</span> Balances
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-avatar">S</div>
          <div>
            <strong>Shared Home</strong>
            <small>Expense workspace</small>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-label">OVERVIEW</p>
            <h1>Dashboard</h1>
          </div>
          <div className="topbar-right">
            <span className="online-dot" />
            <span>Workspace active</span>
          </div>
        </header>

        {error && (
          <div className="message" role="alert">
            {error}
          </div>
        )}

        {message && (
          <p className="success-message" role="status">
            ✓ {message}
          </p>
        )}

        {!home ? (
          <section className="panel welcome-panel" id="dashboard">
            <div className="welcome-icon">₹</div>
            <h2>Welcome to SplitSmart</h2>
            <p>Create a shared home to start managing expenses together.</p>
            <div className="form-row">
              <input
                value={homeName}
                onChange={(event) => setHomeName(event.target.value)}
                placeholder="Enter home name"
                aria-label="Home name"
              />
              <button type="button" onClick={createHome} disabled={loading}>
                Create Home
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="welcome-banner" id="dashboard">
              <div>
                <p className="banner-label">YOUR WORKSPACE</p>
                <h2>Welcome back!</h2>
                <p>Here is your expense overview for {home.name}.</p>
              </div>
              <div className="banner-icon">₹</div>
            </section>

            <section className="summary-grid">
              <article className="summary-card">
                <div className="summary-top">
                  <span>Total Expenses</span>
                  <span className="summary-icon purple">₹</span>
                </div>
                <h2>{formatMoney(totalExpenses)}</h2>
                <p>Across all bills</p>
              </article>

              <article className="summary-card">
                <div className="summary-top">
                  <span>Paid Amount</span>
                  <span className="summary-icon green">✓</span>
                </div>
                <h2>{formatMoney(paidAmount)}</h2>
                <p>Successfully paid</p>
              </article>

              <article className="summary-card">
                <div className="summary-top">
                  <span>Pending Amount</span>
                  <span className="summary-icon orange">◷</span>
                </div>
                <h2>{formatMoney(pendingAmount)}</h2>
                <p>Awaiting payments</p>
              </article>

              <article className="summary-card">
                <div className="summary-top">
                  <span>Total Members</span>
                  <span className="summary-icon blue">♙</span>
                </div>
                <h2>{members.length}</h2>
                <p>In your shared home</p>
              </article>
            </section>

            <section className="panel" id="members">
              <div className="section-heading">
                <div>
                  <h2>Members</h2>
                  <p>People sharing expenses in this home</p>
                </div>
                <span className="count-badge">{members.length} members</span>
              </div>

              <div className="form-row">
                <input
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  placeholder="Enter member name"
                  aria-label="Member name"
                />
                <button type="button" onClick={addMember} disabled={loading}>
                  + Add Member
                </button>
              </div>

              <div className="member-list">
                {members.map((member, index) => (
                  <div className="member-card" key={member.id}>
                    <div className={`member-avatar avatar-${index % 4}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{member.name}</span>
                  </div>
                ))}
                {members.length === 0 && <p className="empty">No members added yet.</p>}
              </div>
            </section>

            <section className="panel" id="create-bill">
              <div className="section-heading">
                <div>
                  <h2>Create a Bill</h2>
                  <p>Add a new shared expense</p>
                </div>
                <span className="section-symbol">＋</span>
              </div>

              <div className="form-row">
                <input
                  value={billTitle}
                  onChange={(event) => setBillTitle(event.target.value)}
                  placeholder="Bill title (e.g. Electricity)"
                  aria-label="Bill title"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={billAmount}
                  onChange={(event) => setBillAmount(event.target.value)}
                  placeholder="Total amount (₹)"
                  aria-label="Total amount in rupees"
                />
                <button
                  type="button"
                  onClick={createBill}
                  disabled={loading || members.length === 0}
                >
                  Split Bill
                </button>
              </div>

              {members.length === 0 && (
                <p className="muted">Add at least one member before creating a bill.</p>
              )}
            </section>

            <section className="panel" id="bills">
              <div className="section-heading">
                <div>
                  <h2>Bills and Payments</h2>
                  <p>Track shared expenses and payment status</p>
                </div>
                <span className="count-badge">{bills.length} bills</span>
              </div>

              {bills.length === 0 ? (
                <p className="empty">No bills created yet.</p>
              ) : (
                bills.map((bill) => (
                  <article className="transaction-card" key={bill.id}>
                    <div className="transaction-heading">
                      <div className="transaction-icon">₹</div>
                      <div className="transaction-title">
                        <strong>{bill.title}</strong>
                        <small>{bill.shares.length} member shares</small>
                      </div>
                      <strong className="transaction-total">{formatMoney(bill.totalCents)}</strong>
                    </div>

                    <div className="transaction-shares">
                      {bill.shares.map((share) => {
                        const member = members.find((item) => item.id === share.memberId)

                        return (
                          <div className="share-row" key={share.id}>
                            <div className="share-member">
                              <div className="small-avatar">
                                {(member?.name ?? 'M').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{member?.name ?? 'Member'}</strong>
                                <span className={share.paidAt ? 'paid' : 'unpaid'}>
                                  {share.paidAt ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                            </div>

                            <span className="share-amount">{formatMoney(share.amountCents)}</span>

                            {!share.paidAt ? (
                              <button
                                type="button"
                                className="pay-button"
                                disabled={loading}
                                onClick={() => payShare(bill.id, share.id)}
                              >
                                Mark Paid
                              </button>
                            ) : (
                              <span className="paid-badge">✓ Paid</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="panel" id="balances">
              <div className="section-heading">
                <div>
                  <h2>Outstanding Balances</h2>
                  <p>See how much each member still owes</p>
                </div>
                <span className="section-symbol">◈</span>
              </div>

              {balances.length === 0 ? (
                <p className="empty">No balance information available.</p>
              ) : (
                balances.map((balance) => (
                  <div className="balance-row" key={balance.memberId}>
                    <div className="share-member">
                      <div className="small-avatar">{balance.name.charAt(0).toUpperCase()}</div>
                      <strong>{balance.name}</strong>
                    </div>
                    <strong className="balance-amount">
                      {formatMoney(balance.outstandingCents)}
                    </strong>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {loading && <p className="loading-text">Please wait...</p>}

        <footer className="dashboard-footer">SplitSmart · Shared expenses made simple</footer>
      </section>
    </main>
  )
}
