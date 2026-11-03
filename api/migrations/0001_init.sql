
CREATE TABLE homes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE members (
  member_order INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  home_id TEXT NOT NULL,
  name TEXT NOT NULL,

  CONSTRAINT fk_members_home
    FOREIGN KEY (home_id) REFERENCES homes(id)
    ON DELETE CASCADE
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL,

  CONSTRAINT fk_bills_home
    FOREIGN KEY (home_id) REFERENCES homes(id)
    ON DELETE CASCADE,

  CONSTRAINT chk_bill_total_positive
    CHECK (total_cents > 0)
);

CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TEXT,
  idempotency_key TEXT,

  CONSTRAINT fk_shares_bill
    FOREIGN KEY (bill_id) REFERENCES bills(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_shares_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_bill_member
    UNIQUE (bill_id, member_id),

  CONSTRAINT chk_share_amount
    CHECK (amount_cents >= 0),

  CONSTRAINT chk_payment_state
    CHECK (
      (paid_at IS NULL AND idempotency_key IS NULL)
      OR
      (paid_at IS NOT NULL AND idempotency_key IS NOT NULL)
    )
);
