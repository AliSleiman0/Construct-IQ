# ConstructIQ — AI Construction Management Platform

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL + Redis)
- npm or pnpm

---

### 1. Start the database and Redis

```bash
docker-compose up -d
```

---

### 2. Backend setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start in development mode
npm run start:dev
```

Backend runs at: http://localhost:4000/api/v1  
Swagger docs: http://localhost:4000/api/docs

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local

# Start in development mode
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Project Structure

```
ConstructIQ/
├── backend/          # NestJS API
├── frontend/         # Next.js web app
└── docker-compose.yml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, MUI 5, TanStack Query, Zustand |
| Backend | NestJS 10, TypeScript, Prisma, PostgreSQL |
| Auth | JWT (httpOnly cookies), bcrypt |
| Queue | BullMQ + Redis |
| AI | OpenAI / LLM (Phase 7) |

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Foundation, Auth, Users |
| 2 | Pending | Organizations, Projects |
| 3 | Pending | Tasks, Phases, Milestones |
| 4 | Pending | Daily Reports, Issues |
| 5 | Pending | Budget, Procurement |
| 6 | Pending | Documents, Dashboard |
| 7 | Pending | AI Layer |
| 8 | Pending | Hardening, Deployment |
