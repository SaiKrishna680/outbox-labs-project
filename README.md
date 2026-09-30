# 📧 ReachInbox — Production-Grade Email Job Scheduler

> A full-stack email scheduling service that accepts email requests via APIs, schedules them using **BullMQ + Redis**, sends them via **Ethereal SMTP**, and exposes a **React dashboard** — built as a hiring assignment for ReachInbox.

![Node.js](https://img.shields.io/badge/Node.js-v20+-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)

---

## 📑 Table of Contents

- [Features Implemented](#-features-implemented)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Setting Up Ethereal Email](#4-setting-up-ethereal-email)
- [Environment Variables](#-environment-variables)
- [How to Use](#-how-to-use)
- [Demo Video](#-demo-video)
- [Assumptions & Trade-offs](#-assumptions--trade-offs)

---

## ✅ Features Implemented

### Backend

| Feature | Description |
|---|---|
| **Email Scheduling API** | `POST /api/emails/schedule` — Accepts email requests and schedules them at a specific time |
| **Bulk Campaign API** | `POST /api/emails/campaigns` — Accepts an array of recipients, creates staggered jobs in BullMQ |
| **BullMQ + Redis Queue** | All jobs are persisted in Redis. No cron jobs — purely event-driven delayed jobs |
| **Persistence on Restart** | Server can crash/restart — BullMQ picks up pending jobs from Redis automatically. No data loss |
| **Ethereal SMTP Sending** | Worker sends emails via Nodemailer + auto-generated Ethereal test accounts |
| **Per-Sender Hourly Rate Limiting** | Atomic Redis counters (`INCR`) enforce a configurable hourly limit per sender. Overflow jobs are delayed to the next hour using `moveToDelayed()` — never dropped |
| **Concurrency Control** | BullMQ worker runs with configurable `concurrency` (default 5 parallel processors) |
| **Idempotency** | Each job has a unique `idempotencyKey`. Worker checks if a job is already `sent` before processing |
| **Google OAuth** | Full OAuth 2.0 flow — login via Google, JWT session, user stored in MySQL |
| **Slack OAuth + Webhooks** | Connect Slack workspace via OAuth. When rate limit is hit, a Slack notification is fired automatically |
| **Elasticsearch Indexing** | Emails are indexed into ES on send completion. Full-text search endpoint at `GET /api/emails/search?q=` |
| **BullMQ Admin Dashboard** | Visual queue monitor at `/api/admin/queues` via Bull Board |
| **Prisma ORM** | Type-safe MySQL access with models: `User`, `Sender`, `EmailJob`, `Campaign` |

### Frontend

| Feature | Description |
|---|---|
| **Google Login Page** | Centered card UI with "Login with Google" button (matches Figma) |
| **Dashboard Layout** | Left sidebar with user avatar, Compose button, Scheduled/Sent navigation |
| **Scheduled Emails Tab** | Live table showing all pending scheduled emails with status badges |
| **Sent Emails Tab** | Live table showing all successfully sent emails with timestamps |
| **Compose — Single Email** | Form to schedule a single email to one recipient with optional datetime picker |
| **Compose — Bulk Campaign** | Paste comma/newline-separated recipients, set delay between sends |
| **Slack Integration Button** | "Connect Slack" in sidebar — triggers OAuth flow, shows "Connected" status |
| **Search & Filter** | Client-side search across recipients and subjects |
| **JWT Auth Flow** | Token stored in localStorage, attached via Axios interceptor on every request |

---

## 🏗 Architecture Overview

### How Scheduling Works

```
┌──────────────┐     POST /api/emails/schedule      ┌──────────────┐
│   Frontend   │ ──────────────────────────────────► │  Express API │
│  (React App) │                                     │  (Port 3001) │
└──────────────┘                                     └──────┬───────┘
                                                            │
                                          ┌─────────────────▼─────────────────┐
                                          │  1. Save EmailJob to MySQL        │
                                          │  2. Add job to BullMQ with delay  │
                                          │     (delay = scheduledAt - now)   │
                                          └─────────────────┬─────────────────┘
                                                            │
                                                            ▼
                                                    ┌───────────────┐
                                                    │  Redis Queue  │
                                                    │  (BullMQ)     │
                                                    │  Delayed Jobs │
                                                    └───────┬───────┘
                                                            │ Timer fires
                                                            ▼
                                                    ┌───────────────┐
                                                    │  Email Worker │
                                                    │  (Concurrent) │
                                                    └───────┬───────┘
                                                            │
                                          ┌─────────────────▼─────────────────┐
                                          │  1. Check idempotency (skip if    │
                                          │     already sent)                 │
                                          │  2. Check rate limit (Redis INCR) │
                                          │  3. Send via Ethereal SMTP        │
                                          │  4. Update DB status → "sent"     │
                                          │  5. Index in Elasticsearch        │
                                          └───────────────────────────────────┘
```

### How Persistence on Restart Works

- When a job is scheduled, it is stored in **two places**:
  1. **MySQL** (via Prisma) — permanent record with status tracking
  2. **Redis** (via BullMQ) — the actual delayed job that triggers processing
- If the server crashes and restarts:
  - The BullMQ **Worker** automatically reconnects to Redis and **resumes processing** any pending/delayed jobs
  - No jobs are lost because Redis persists them on disk
  - The MySQL status field acts as the source of truth for idempotency

### How Rate Limiting & Concurrency Work

**Rate Limiting (Per-Sender, Per-Hour):**
```
Key:    rate:sender:{senderId}:{YYYY-MM-DDTHH}
Method: Redis INCR (atomic increment)
TTL:    2 hours (auto-cleanup)
```
- Before sending, the worker atomically increments the counter
- If `count > MAX_EMAILS_PER_HOUR_PER_SENDER`, the job is **not dropped** — it's moved to BullMQ's Delayed state until the start of the next hour via `job.moveToDelayed()`
- A Slack webhook notification is fired to alert the user

**Concurrency:**
- BullMQ Worker is initialized with `concurrency: 5` (configurable via `WORKER_CONCURRENCY` in `.env`)
- This means up to 5 emails are processed in parallel at any time
- A configurable `MIN_DELAY_BETWEEN_SENDS_MS` (default 2000ms) adds a throttle inside each worker to mimic real-world provider rate limits

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MySQL 8.x + Prisma ORM |
| **Queue** | BullMQ + Redis (Memurai on Windows) |
| **Email** | Nodemailer + Ethereal Email (fake SMTP) |
| **Search** | Elasticsearch 8.x |
| **Auth** | Google OAuth 2.0 + JWT |
| **Notifications** | Slack OAuth + Incoming Webhooks |
| **Frontend** | React 18, Vite, Tailwind CSS v4, Lucide Icons |
| **Admin** | Bull Board (BullMQ Dashboard) |

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed and running on your machine:

| Service | Required | Port |
|---|---|---|
| **Node.js** | v20+ | — |
| **MySQL** | 8.x | 3306 |
| **Redis** | Any (Memurai on Windows) | 6379 |
| **Elasticsearch** | 8.x | 9200 |

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/reachinbox-scheduler.git
cd reachinbox-scheduler
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#-environment-variables) below).

Then push the Prisma schema to your MySQL database:

```bash
npx prisma db push
```

Start the backend server + BullMQ worker (they run together):

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📋 Health check: http://localhost:3001/api/health
✅ Redis connected
```

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE v5.4.19  ready in 613 ms
➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

### 4. Setting Up Ethereal Email

**You don't need to do anything manually!** The backend automatically creates Ethereal test accounts on the fly.

When the worker processes its first email for a sender:
1. It calls `nodemailer.createTestAccount()` to generate a disposable SMTP account
2. It stores the credentials (`etherealUser`, `etherealPass`) in the `Sender` table in MySQL
3. All subsequent emails from that sender reuse the same credentials
4. Preview URLs are logged to the server console (e.g., `https://ethereal.email/message/...`)

> **Note:** If your ISP/network blocks outbound SMTP ports (587/465), the worker gracefully mocks the send and marks the email as "sent" for demo purposes. This is logged with a warning.

---

## 🔐 Environment Variables

Create `backend/.env` with the following:

```env
# Server
PORT=3001
NODE_ENV=development

# MySQL
DATABASE_URL=mysql://root:<your-password>@localhost:3306/reachinbox

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Slack OAuth (https://api.slack.com/apps)
SLACK_CLIENT_ID=<your-slack-client-id>
SLACK_CLIENT_SECRET=<your-slack-client-secret>
SLACK_REDIRECT_URI=http://localhost:3001/api/slack/callback

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Email Scheduling
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_SENDS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 How to Use

1. **Login** — Open `https://outbox-labs-project.vercel.app/` and click "Login with Google"
2. **Connect Slack** — Click "Connect Slack" in the sidebar to enable rate-limit notifications
3. **Compose Single Email** — Click "Compose" → fill in recipient, subject, body → optionally pick a future time → click "Schedule Send"
4. **Compose Bulk Campaign** — Click "Compose" → switch to "Bulk Campaign" tab → paste comma-separated emails → set delay → click "Schedule Send"
5. **View Dashboard** — Click "Scheduled" tab to see pending emails, "Sent" tab to see delivered ones
6. **Admin Queue Monitor** — Visit `https://reachinbox-api-ce8d.onrender.com/api/admin/queues/` to see the BullMQ dashboard with active, delayed, and failed jobs
7. **Test Rate Limiting** — Set `MAX_EMAILS_PER_HOUR_PER_SENDER=2` in `.env`, restart the backend, schedule 5+ emails — watch the first 2 get sent and the rest get delayed with a Slack alert

---

## 🎬 Demo Video

> _A short demo video (under 5 minutes) showcasing the full flow is available here:_
>
> 📹 **[Watch Demo Video](#)** _(https://drive.google.com/drive/folders/17fNKwfBg-94rgzAThfiu29_5y7gwfOik?usp=drive_link)_
>
> The video covers:
> - Google OAuth Login
> - Scheduling a single email
> - Scheduling a bulk campaign
> - Rate limiting in action (jobs getting delayed)
> - Slack webhook notification
> - BullMQ Admin Dashboard
> - Server restart persistence test

---

## ⚠️ Assumptions & Trade-offs

| # | Item | Details |
|---|---|---|
| 1 | **No Docker** | The assignment stated Docker is optional. All services (MySQL, Redis, Elasticsearch) are run locally on Windows |
| 2 | **Ethereal Email** | Emails are sent to Ethereal's fake SMTP. If outbound SMTP is blocked by the ISP/firewall, the worker mocks success and logs a warning — this ensures the queue doesn't get stuck during demos |
| 3 | **Single Worker Process** | The BullMQ worker runs inside the same Express server process (`import './workers/emailWorker'`). In production, this should be a separate process for better fault isolation |
| 4 | **Auth Simplification** | Only Google OAuth is implemented for login. The email/password fields on the login page are disabled placeholders (matching the Figma design) |
| 5 | **Slack Callback Auth** | The Slack OAuth callback endpoint is public (no JWT required) because Slack redirects the browser directly — the `userId` is passed securely via the OAuth `state` parameter |
| 6 | **Elasticsearch Optional** | If Elasticsearch is not running, the app still works — indexing errors are caught and logged silently. Search returns empty results |
| 7 | **Rate Limit Window** | Rate limiting uses a 1-hour fixed window (not sliding window). This is simpler and sufficient for the assignment scope |
| 8 | **No CSV Upload** | The bulk campaign feature accepts comma/newline-separated emails in a textarea. CSV file upload was deprioritized in favor of core scheduling reliability |
| 9 | **MySQL Password in URL** | The `DATABASE_URL` contains the password in plaintext. In production, this should use secrets management (e.g., AWS Secrets Manager, Vault) |

---

## 📁 Project Structure

```
reachinbox-scheduler/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # DB models: User, Sender, EmailJob, Campaign
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts           # Environment config loader
│   │   │   ├── redis.ts           # Redis/ioredis connection
│   │   │   └── prisma.ts          # Prisma client singleton
│   │   ├── controllers/
│   │   │   ├── authController.ts  # Google OAuth + JWT
│   │   │   ├── emailController.ts # Schedule, list scheduled/sent
│   │   │   └── slackController.ts # Slack OAuth + webhook notify
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification middleware
│   │   │   └── errorHandler.ts    # Global error handler
│   │   ├── queues/
│   │   │   └── emailQueue.ts      # BullMQ queue definition
│   │   ├── routes/
│   │   │   ├── index.ts           # Route aggregator + Bull Board
│   │   │   ├── authRoutes.ts      # /api/auth/*
│   │   │   ├── emailRoutes.ts     # /api/emails/*
│   │   │   └── slackRoutes.ts     # /api/slack/*
│   │   ├── services/
│   │   │   ├── emailService.ts    # Core scheduling + campaign logic
│   │   │   └── elasticsearch.ts   # ES indexing + search
│   │   ├── utils/
│   │   │   └── ethereal.ts        # Auto Ethereal account creation
│   │   ├── workers/
│   │   │   └── emailWorker.ts     # BullMQ processor + rate limiter
│   │   └── index.ts               # Express app entry point
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx         # Sidebar + navigation shell
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Google OAuth login page
│   │   │   ├── Dashboard.tsx      # Scheduled/Sent email tables
│   │   │   └── Compose.tsx        # Single + Bulk email composer
│   │   ├── services/
│   │   │   └── api.ts             # Axios client with JWT interceptor
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces
│   │   ├── App.tsx                # Router + protected routes
│   │   └── main.tsx               # React entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 📜 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | Health check (Redis + DB status) |
| `GET` | `/api/auth/google` | ❌ | Initiates Google OAuth flow |
| `GET` | `/api/auth/google/callback` | ❌ | Google OAuth callback → JWT |
| `GET` | `/api/auth/me` | ✅ | Get current authenticated user |
| `POST` | `/api/emails/schedule` | ✅ | Schedule a single email |
| `POST` | `/api/emails/campaigns` | ✅ | Schedule a bulk campaign |
| `GET` | `/api/emails/scheduled` | ✅ | List all scheduled emails |
| `GET` | `/api/emails/sent` | ✅ | List all sent emails |
| `GET` | `/api/emails/search?q=` | ✅ | Full-text search via Elasticsearch |
| `GET` | `/api/slack/connect` | ✅ | Get Slack OAuth URL |
| `GET` | `/api/slack/callback` | ❌ | Slack OAuth callback |
| `GET` | `/api/admin/queues` | ❌ | BullMQ Dashboard (Bull Board UI) |

---

<p align="center">
  Built with ❤️ for the <strong>ReachInbox</strong> hiring assignment
</p>
