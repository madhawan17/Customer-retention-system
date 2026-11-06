-- ============================================================
-- 001_init.sql  –  Wholesale Customer Retention System Schema
-- ============================================================

-- ── Customers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  NOT NULL UNIQUE,
  tier          VARCHAR(20)  NOT NULL DEFAULT 'bronze' CHECK (tier IN ('gold', 'silver', 'bronze')),
  salesperson   VARCHAR(255) NOT NULL,
  credit_days   INT          NOT NULL DEFAULT 30,
  stop_messages BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Invoices ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_no    VARCHAR(50)  NOT NULL UNIQUE,
  amount        NUMERIC(12,2) NOT NULL,
  paid_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date      DATE         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_date    DATE         NOT NULL,
  items         JSONB        NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Message Outbox ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbox (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id    INT          REFERENCES invoices(id) ON DELETE SET NULL,
  stage         VARCHAR(50),
  body          TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  direction     VARCHAR(10)  NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Invoice Stage Tracking (idempotency guard) ──────────────
CREATE TABLE IF NOT EXISTS invoice_stages (
  id            SERIAL PRIMARY KEY,
  invoice_id    INT          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  stage_name    VARCHAR(50)  NOT NULL,
  fired_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_stage UNIQUE (invoice_id, stage_name)
);

-- ── Cases ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id    INT          REFERENCES invoices(id) ON DELETE SET NULL,
  type          VARCHAR(50)  NOT NULL CHECK (type IN ('firm_followup', 'dispute', 'promise_to_pay', 'reorder_dropoff')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved', 'escalated')),
  owner         VARCHAR(255) NOT NULL,
  timeline      JSONB        NOT NULL DEFAULT '[]',
  opened_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  escalated_at  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  CONSTRAINT uq_case_invoice_type UNIQUE (invoice_id, type)
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  case_id       INT          REFERENCES cases(id) ON DELETE CASCADE,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          VARCHAR(50)  NOT NULL,
  message       TEXT         NOT NULL,
  read          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Offers Sent ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers_sent (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id    INT          REFERENCES invoices(id) ON DELETE SET NULL,
  offer_type    VARCHAR(50)  NOT NULL,
  expiry_date   DATE         NOT NULL,
  used          BOOLEAN      NOT NULL DEFAULT FALSE,
  sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Promise to Pay ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promise_to_pay (
  id            SERIAL PRIMARY KEY,
  invoice_id    INT          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  promised_date DATE         NOT NULL,
  fulfilled     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_promise_invoice UNIQUE (invoice_id)
);

-- ── Fake Clock State (single row) ───────────────────────────
CREATE TABLE IF NOT EXISTS clock_state (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  simulated_date DATE NOT NULL
);

-- Seed the clock to today on first migration
INSERT INTO clock_state (id, simulated_date)
VALUES (1, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_outbox_customer     ON outbox(customer_id);
CREATE INDEX IF NOT EXISTS idx_outbox_sent_at      ON outbox(sent_at);
CREATE INDEX IF NOT EXISTS idx_cases_customer      ON cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status        ON cases(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date         ON orders(order_date);

