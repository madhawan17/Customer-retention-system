24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

# 24-Hour Technical Assignment: Wholesale Customer Retention & Payment Follow-up System 

**Time:** 24 hours · **Submit:** one public GitHub repository link, nothing else · **Expected effort:** 8–10 focused hours 

## 1. The brief 

You run a wholesale business that sells to retailers on 15 to 30 day credit. Build a small system that chases payments in stages, sends offers, reminds customers to reorder, and escalates stuck cases. Every WhatsApp message goes through a **mock WhatsApp** that you build, so the whole system can be tested from a browser or terminal with no phone, API key or paid account. 

## 2. How to submit (GitHub only) 

- The reviewer will only clone your repo and run it. The repo must contain: 

   - **README.md** with the exact commands to start PostgreSQL, install, migrate, seed, run the backend and frontend, and run the tests ( `docker compose up -d` , `npm run migrate` , `npm run seed` , `npm run dev` , `npm test` ) 

   - **DEMO.md** : a step-by-step walkthrough with screenshots or a short GIF committed in the repo (this replaces a demo video) 

   - A seed script, automated tests, and `.env.example` (no real keys) 

   - Regular commits made inside the 24 hours; we check the first and last commit timestamps 

   - No hosting or deployment needed. The tech stack is fixed (see section 3). 

## 3. Required tech stack 

Everyone uses the **same stack** , so submissions can be compared fairly and run the same way. A different language, framework or database is not accepted. 

|Layer|Required|Notes|
|---|---|---|
|Runtime|Node.js 20 LTS or newer,<br>with npm|Commit<br>`package-lock.json`|



Page 1 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

|Layer|Required|Notes|
|---|---|---|
|Backend|Express.js|REST API and webhook, in the<br>`backend`<br>folder, runs on port 4000|
|Frontend|React.js with Next.js|In the<br>`frontend`folder, runs on port 3000;<br>holds the mock WhatsApp chat and the<br>staff panel|
|Database|PostgreSQL 15 or newer|Schema created by SQL migration files; use<br>`pg`, Knex or Prisma|
|Language|JavaScript or TypeScript|TypeScript is a bonus|
|Config|JSON files|`backend/config/stages.json`and<br>`offers.json`|
|Tests|Jest or Vitest with Supertest|Minimum 10 tests, including the six<br>scenarios, run against a separate test<br>database|
|Local<br>database|Docker Compose for<br>PostgreSQL only|`docker-compose.yml`starts Postgres; the<br>apps run with plain<br>`npm`|
|Environment|`.env.example`|`DATABASE_URL`,<br>`PORT`,<br>`NEXT_PUBLIC_API_URL`|
|Messaging|Your own<br>`MockProvider`|No Twilio, Meta or any external API|
|Scheduling|None|The fake clock endpoint triggers the stage<br>engine, so no cron, BullMQ or Redis|



**Not allowed:** hosted databases (Supabase, Neon and similar), Redis, real WhatsApp keys, ngrok or tunnels, committed secrets, and committed database dumps. 

**Allowed:** UI libraries such as Tailwind, shadcn or MUI. UI polish is not scored. 

**Optional:** TypeScript, Prisma, GitHub Actions running the tests, a Dockerfile for the apps. 

### Required repository layout 

```
retention-system/
  backend/
    src/
      server.js            # Express app
      routes/              # clock, customers, payments, webhook, cases,
notifications
      services/
        engine.js          # stage engine
```

Page 2 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

```
        cases.js           # cases and escalation
        offers.js
        reorder.js
        clock.js           # fake clock
      providers/
        messageProvider.js # interface
        mockProvider.js
        cloudApiProvider.js# empty stub
      db/
        pool.js
        migrations/001_init.sql
    config/
      stages.json
      offers.json
    scripts/
      seed.js
    tests/
      scenarios.test.js
      engine.test.js
    package.json
  frontend/
    app/                   # Next.js pages
      page.js              # mock WhatsApp chat
      staff/page.js        # staff and escalation panel
    components/
    package.json
  docker-compose.yml       # PostgreSQL
  .env.example
  README.md
  DEMO.md
```

Exact file names can differ slightly, but the separation (engine, providers, cases, config, tests) must be visible. 

### Required API endpoints (Express) 

|Method and path|Purpose|
|---|---|
|`POST /clock/advance?days=N`|Move the fake date forward and run the<br>stage engine|
|`GET /clock`|Show the current fake date|
|`GET /customers`and<br>`GET`|List customers and their chat history|
|`/customers/:id/messages`||



Page 3 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

|Method and path|Purpose|
|---|---|
|`POST /payments`|Record a full or partial payment against an<br>invoice|
|`POST /webhook/incoming`|Receive a customer reply (<br>`PAID`,<br>`PROMISE`<br>`<date>`,<br>`DISPUTE`,<br>`STOP`,<br>`YES`)|
|`GET /cases`|List cases with owner, status and timeline|
|`GET /notifications`|Staff notifications and escalations|
|`POST /seed/reset`|Reset the database to the seed state (used<br>by tests and the reviewer)|



Enable CORS on the backend so the Next.js app on port 3000 can call it. 

### Run commands the README must list 

|`docker compose up -d`|`# start PostgreSQL`|
|---|---|
|`cd backend && npm install`||
|`npm run migrate`|`# create tables`|
|`npm run seed`|`# load sample data`|
|`npm run dev`|`# API on http://localhost:4000`|
|`npm test`|`# run tests`|
|`cd frontend && npm install`||
|`npm run dev`|`# UI on http://localhost:3000`|



## 4. What to build 

### 4.1 Data and seed 

PostgreSQL database (tables created by migrations) with customers (phone, tier, salesperson, credit terms), invoices (amount, due date, paid amount) and past orders (date, items). The seed script creates **10 customers, 20 invoices and 30 past orders** covering: not yet due, due today, 3, 7 and 15 days overdue, partially paid, and fully paid. 

### 4.2 Payment follow-up stages 

Stages live in a **config file** (JSON), not in code. Build these five: 

Page 4 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

|Stage|Days from due date|Action|
|---|---|---|
|Pre-due reminder|-2|Friendly reminder|
|Due-day reminder|0|Reminder with amount|
|Soft follow-up|+3|Polite nudge|
|Firm follow-up|+7|Firm message, open a case for the salesperson|
|Final notice|+15|Final warning, escalate to manager|



```
{
  "stages": [
    {
      "name": "soft_followup",
      "dayOffset": 3,
      "template": "Hi {name}, invoice {invoice_no} of Rs {balance} was due on
{due_date}. Please pay today."
    }
  ]
}
```

Rules: a stage fires **once per invoice** (idempotent), stops as soon as the invoice is paid, uses the **remaining balance** after a partial payment, and sends one message per customer per day (merge multiple overdue invoices into one message). 

### 4.3 Fake clock 

Build a simulated "today" that you can move forward ( `POST /clock/advance?days=7` or a CLI command). Each advance runs the stage engine once. This lets a reviewer test a 30day cycle in under a minute. 

### 4.4 Mock WhatsApp and test platform 

- A `MessageProvider` interface with a `MockProvider` . Messages are saved in an outbox table with status (sent, delivered, read). 

- A simple web page (a Next.js page with React components) showing a chat per customer, a box to **reply as the customer** , a button to move the clock forward, and a button to record a payment. 

- An incoming webhook `POST /webhook/incoming` that understands these replies: `PAID` , `PROMISE <date>` , `DISPUTE` , `STOP` , `YES` . 

- A second panel for internal staff showing case and escalation notifications. 

Page 5 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

A real WhatsApp adapter is **not required** . Add an empty `CloudApiProvider` class with a short comment on how it would plug in. 

### 4.5 Cases and escalation 

- Cases are created for: firm follow-up, dispute, promise-to-pay, reorder drop-off 

- Each case has an owner, status (open, waiting, resolved, escalated), and a timeline of events 

- If a case stays open for 2 simulated days, it escalates to the manager and a notification appears in the staff panel 

- A paid invoice auto-resolves its case; no duplicate cases for the same invoice 

### 4.6 Offers (only two) 

1. **Early-payment discount:** 2% off if paid within 3 days of invoice, sent on invoice day 

2. **Win-back offer:** customers with no order in 45+ days get a coupon valid for 7 days Each offer has eligibility, an expiry date and one use per customer. Customers with invoices 15+ days overdue never receive offers. 

### 4.7 Reorder reminders 

Calculate each customer's average gap between orders. When today reaches 90% of that gap, send a reorder reminder listing the last order. Replying `YES` creates a draft order. If the customer has an overdue invoice, send the payment message instead of the reorder reminder. 

## 5. Six required scenarios 

These are exactly what the reviewer will test. Write one automated test for each. 

|#|Scenario|Expected result|
|---|---|---|
|1|Customer pays before the due date|No follow-up is ever sent|
|2|Customer pays 40% on day +3|Next reminder shows the reduced balance|
|3|Customer replies<br>`PROMISE`with a<br>date|Reminders pause until that date, then resume<br>at a firmer stage if unpaid|
|4|Customer replies<br>`DISPUTE`|Collections pause, a dispute case opens for<br>the salesperson|
|5|Customer replies<br>`STOP`|No further messages; salesperson is notified|



Page 6 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

|#|Scenario|Expected result|
|---|---|---|
|6|Customer has 3 overdue invoices|One combined message, not three|



## 6. Bonus (optional) 

TypeScript, a dashboard of overdue amounts by age, quiet hours (no messages 9 PM to 9 AM), Hindi/Hinglish templates, a customer-tier-based stage timing, retry on failed messages. 

## 7. Suggested time plan 

|Hours|Focus|
|---|---|
|0-2|Schema, stage config, seed script|
|2-7|Stage engine, fake clock, message outbox|
|7-12|Mock WhatsApp page, webhook, reply handling|
|12-17|Cases, escalation, offers, reorder|
|17-22|Tests for the six scenarios, bug fixes|
|22-24|README, DEMO.md, screenshots, final push|



## 8. Evaluation (100 points) 

|Area|Points|What we check|
|---|---|---|
|Runs from a clean clone with the<br>README commands|15|Setup works first time|
|Stage engine correctness|20|Timing, idempotency, partial payment,<br>stop on payment|
|Six scenarios pass|18|Tests exist and pass|
|Mock WhatsApp and webhook|12|Chat page, replies change system<br>behaviour|
|Cases and escalation|12|Lifecycle, no duplicates, manager<br>notification|



Page 7 of 8 

24-Hour Assignment: Wholesale Customer Retention & Payment Follow-up System 

|Area|Points|What we check|
|---|---|---|
|Offers and reorder|8|Rules and eligibility|
|Code quality and structure|8|Config-driven, readable, provider<br>interface|
|README, DEMO.md, commit history|7|Clear, honest, steady commits|



## 9. Rules 

- Any libraries and AI tools are allowed, but you must be able to explain every part in a follow-up call. 

- A working core beats a long feature list. Do not submit half-built extras. 

- When something is unclear, make an assumption and write it in the README. 

- Anything pushed after the 24-hour deadline is ignored. 

Page 8 of 8 

