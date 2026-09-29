# ReachInbox - Email Job Scheduler

A production-grade full-stack email scheduler service built as a clone/slice of ReachInbox's architecture.

## Features Built
- **Backend**: Node.js, Express, TypeScript, Prisma (MySQL)
- **Frontend**: React, Vite, Tailwind CSS v4, Lucide Icons
- **Authentication**: Google OAuth with JWT sessions
- **Job Queue**: BullMQ backed by Redis for reliable job persistence across restarts
- **Email Sending**: Nodemailer with auto-generated Ethereal SMTP test accounts
- **Rate Limiting**: Strictly enforced hourly rate limits (e.g. 200/hr) per sender using Redis atomic counters. Overflow jobs are mathematically delayed to the next hour rather than dropped.
- **Bulk Campaigns**: Schedule thousands of emails staggered by X seconds to avoid queue spikes.
- **Integrations**: 
  - **Slack**: Full OAuth integration to send webhooks when a user's rate limit is hit.
  - **Elasticsearch**: Automatic indexing of emails for blazing-fast full-text search.
- **Admin Dashboard**: Built-in Bull Board at `/api/admin/queues`.

## Getting Started

### Prerequisites
1. Node.js v20+
2. MySQL (running on port 3306)
3. Redis (Memurai on Windows, running on port 6379)
4. Elasticsearch (running on port 9200)

### Setup
1. `cd backend`
2. `npm install`
3. Configure your `.env` file (MySQL DB, Google OAuth creds, Slack creds).
4. `npx prisma db push`
5. `npm run dev` (starts on port 3001)

1. `cd frontend`
2. `npm install`
3. `npm run dev` (starts on port 5173)

### Usage
- Open **http://localhost:5173** and click "Login with Google".
- You can schedule single emails or bulk campaigns using the Compose button.
- Check the BullMQ dashboard at **http://localhost:3001/api/admin/queues**
- Connect your Slack via the Sidebar button. If you schedule a campaign that exceeds the `MAX_EMAILS_PER_HOUR_PER_SENDER` inside your backend `.env`, the overflow emails will be delayed, and you will receive a Slack webhook notification immediately!
