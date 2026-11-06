# DEMO.md — System Walkthrough

> Step-by-step walkthrough for the reviewer. All 6 scenarios can be tested in under 5 minutes.

---

## Step 1: Start the system

```bash
docker compose up -d
cd backend && npm install && npm run migrate && npm run seed && npm run dev
# In a new terminal:
cd frontend && npm install && npm run dev
```

Open **http://localhost:3000**

---

## Step 2: Explore the WhatsApp Chat UI

The left sidebar shows all 10 seeded customers with their outstanding balances and tier badges.

The top bar shows the current **fake date** (set to today when seeded).

Controls:
- **Advance Clock** — moves the fake date forward N days and runs the stage engine
- **Quick reply buttons** — PAID, DISPUTE, STOP, YES, PROMISE +7d
- **Text input** — type any reply keyword

---

## Scenario 1: Customer pays before due date — no follow-up sent

1. Select **Sunita Enterprises** (c7 — INV-007 is fully PAID, 5 days overdue)
2. Advance clock 10 days
3. ✅ **No stage messages appear in chat** — engine skips paid invoices

---

## Scenario 2: Partial payment shows reduced balance

1. Select **Deepak Mart** (c6 — INV-006: Rs 20,000, Rs 8,000 paid = Rs 12,000 balance)
2. Advance clock 1 day
3. ✅ **Message shows Rs 12,000** (remaining balance), not Rs 20,000 (original amount)

---

## Scenario 3: PROMISE reply pauses reminders

1. Select **Priya Stores** (c3 — INV-003 is 3 days overdue)
2. Advance clock 1 day → **soft_followup fires**
3. Click **PROMISE +7d** quick button → sends PROMISE reply with a future date
4. Advance clock 5 more days → ✅ **No firm_followup message** — paused by promise
5. Advance clock 10 more days (past the promise date) → firm_followup fires

---

## Scenario 4: DISPUTE reply pauses collections

1. Select **Mahesh Distributors** (c4 — INV-004 is 7 days overdue)
2. Advance clock 1 day → **firm_followup fires**, case opened in Staff Panel
3. Click **DISPUTE** quick button
4. Go to **Staff Panel** → ✅ **Dispute case visible** with status "open"
5. Advance clock 10 more days → ✅ **No final_notice sent** — collections paused

---

## Scenario 5: STOP reply halts all messages

1. Select **Kavita Retail** (c5)
2. Click **STOP** quick button
3. Customer list shows **⛔ Messages stopped** badge for this customer
4. Advance clock 20 days → ✅ **No stage messages** in chat
5. Go to **Staff Panel** → ✅ **STOP notification** visible for salesperson

---

## Scenario 6: 3 overdue invoices merged into 1 message

1. Select **Vinod Supplies** (c8 — has INV-008, INV-009, INV-010 all overdue)
2. Advance clock 1 day
3. ✅ **Exactly 1 message** in chat (not 3) listing all 3 invoices combined

---

## Step 3: Staff Panel

Navigate to **http://localhost:3000/staff**

- **Cases tab**: Shows all open cases with type, status, owner, invoice details, and expandable timeline
- **Notifications tab**: Shows escalations (red border), disputes, STOP alerts — with "Mark read" button

After advancing the clock to day +2 past any open case's creation → case auto-escalates and notification appears.

---

## Step 4: Run the Tests

```bash
cd backend
npm test
```

Expected output:
```
PASS tests/scenarios.test.js
  Scenario 1: Customer pays before due date
    ✓ no follow-up messages sent for a fully-paid invoice
  Scenario 2: Partial payment shows reduced balance
    ✓ reminder message contains reduced balance after partial payment
  ...

PASS tests/engine.test.js
  ✓ E1: stage fires exactly once per invoice (idempotency)
  ✓ E2: pre_due stage fires when clock is 2 days before due date
  ...

Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
```

---

## Step 5: Reset and replay

```bash
curl -X POST http://localhost:4000/seed/reset
```

Or via the Staff Panel's reset button (if implemented).

The database returns to the initial seed state. Clock resets to today.

---

## Key Design Points (for follow-up call)

1. **Idempotency**: `invoice_stages` table has UNIQUE(invoice_id, stage_name). Engine uses `ON CONFLICT DO NOTHING`. Running the engine twice on the same date is safe.

2. **Config-driven**: All 5 stages live in `stages.json`. Adding a new stage = one JSON entry, zero code changes.

3. **Provider interface**: `MockProvider` and `CloudApiProvider` both implement the same `MessageProvider` interface. Switching to real WhatsApp = changing one import in `engine.js`.

4. **No cron, no Redis**: The fake clock endpoint is the only scheduler. This keeps infra at zero extra services.

5. **Multi-invoice merge**: The engine collects all messages in a Map keyed by customer ID, then sends one combined message per customer per engine run.

