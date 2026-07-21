# PackCare

A real-time, multi-caregiver pet-medication tracker that prevents accidental double-dosing.

When several people share care of a pet (especially a diabetic pet on insulin), it is easy for two caregivers to give the same dose without knowing the other already did. PackCare keeps a single live record of every dose so this cannot happen.

## Features

- Shared, real-time care timeline across all caregivers
- Double-dose prevention with layered safety checks
- Live presence so you can see when someone else is about to log a dose
- Scheduled dose reminders and overdue alerts
- Google sign-in

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Socket.IO client, React Query
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Data:** MongoDB (replica set), Redis
- **Infra:** Docker Compose

## Architecture

Three services behind a gateway:

- **gateway** - API/BFF, authentication, and all WebSocket connections
- **care-log** - core domain and double-dose safety logic
- **scheduler** - dose reminders and overdue alerts (node-cron)
- **web** - React client

## Getting Started

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:5173.
