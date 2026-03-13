# RodBus NFC Tracker

A bus/ride cost-splitting app where passengers tap NFC stickers (or scan QR codes) to log rides, and costs are automatically split fairly among participants.

## Tech Stack

- **Framework:** Next.js 15 (React 19, TypeScript)
- **Styling:** Tailwind CSS 4
- **Auth:** Clerk
- **Database:** PostgreSQL (Neon serverless) with Prisma ORM
- **i18n:** English & Thai

## Features

### Passengers

- **NFC / QR check-in** — tap a sticker or scan a QR code to log outbound and return trips
- **Debt tracking** — see real-time pending debts with per-day cost breakdowns
- **Trip & payment history** — browse past trips and payment records with date filters

### Admins / Drivers

- **Cost entry** — record daily gas and parking costs per car
- **Debt settlement** — record payments from passengers
- **User management** — approve pending users, assign roles, remove access
- **Car management** — register cars, set default gas costs
- **Date management** — disable operating dates (holidays, etc.)
- **QR code generation** — create QR codes for cars as an NFC alternative

### System

- **Fair cost splitting** — gas costs proportional to trip count; parking split equally among all passengers + driver
- **Anti-fraud** — 2-hour debounce prevents duplicate taps
- **Role-based access** — PENDING → USER → ADMIN progression
- **Bilingual UI** — full English and Thai support with Buddhist calendar year

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- [Clerk](https://clerk.com) account for authentication

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in: DATABASE_URL, DIRECT_DATABASE_URL, CLERK keys

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint check |

## Data Models

| Model | Purpose |
|-------|---------|
| **User** | Clerk-synced user with role (PENDING/USER/ADMIN) |
| **Car** | Vehicle with owner, name, and default gas cost |
| **Trip** | Single NFC tap — OUTBOUND or RETURN |
| **DailyCost** | Per-car daily gas + parking cost |
| **Payment** | Debt settlement record with amount and note |
| **DisabledDate** | Dates when service is not operating |

## Cost Splitting Logic

- **Gas:** Daily gas cost is split in half per leg (outbound / return). Each half is divided equally among that leg's headcount (passengers + driver). A passenger only pays for legs they rode.
- **Parking:** Split equally among outbound riders only (passengers + driver), because the fee is paid once when arriving in the morning.
- **Driver** (car owner) never owes debt — only passengers pay.
- Payments are applied to the oldest debts first.

## Project Structure

```
src/
├── app/
│   ├── api/tap/          # NFC tap endpoint
│   ├── api/costs/        # Cost save endpoint
│   ├── admin/            # Admin panel (users, cars, dates, QR)
│   ├── dashboard/        # Main dashboard & history
│   ├── sign-in/          # Clerk sign-in
│   ├── sign-up/          # Clerk sign-up
│   ├── pending-approval/ # Waiting screen for new users
│   └── tap-success/      # Post-tap confirmation
└── lib/
    ├── auth.ts           # Auth utilities
    ├── prisma.ts         # Prisma client
    ├── cost-splitting.ts # Debt calculation
    ├── admin-actions.ts  # Server actions
    ├── i18n.ts           # Translations
    ├── i18n-context.tsx  # i18n React context
    └── timezone.ts       # Bangkok timezone helpers
```
