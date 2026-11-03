# Shared Bill Splitter

A simple full-stack application for shared homes to manage members, split bills equally, track individual shares, and record payments.

## Features

- Create a shared home.
- Add members to a home.
- Create bills and automatically split the total between all home members.
- Handle extra cents according to the order in which members were added.
- Allow members to pay their individual shares.
- Prevent duplicate payments using idempotency keys.
- Display bills, payment status, and outstanding balances.
- Restore the previously selected home after refreshing the page.
- Handle loading, empty, and error states.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- TanStack Router
- CSS

### Backend
- Hono
- TypeScript
- Cloudflare Workers

### Database
- Cloudflare D1 (SQLite)
- SQL migrations

### Testing and Code Quality
- Vitest
- Workers runtime testing
- Biome
- pnpm

## Project Structure

```text
shared-bill-splitter/
│
├── api/
│   ├── migrations/
│   │   └── 0001_init.sql
│   ├── src/
│   │   └── index.ts
│   ├── test/
│   │   ├── homes.test.ts
│   │   ├── bills.test.ts
│   │   └── payments.test.ts
│   └── wrangler.jsonc
│
├── web/
│   └── src/
│       ├── lib/
│       │   └── api.ts
│       ├── routes/
│       │   ├── __root.tsx
│       │   └── index.tsx
│       ├── index.css
│       └── main.tsx
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- pnpm

### Installation

Clone the repository:

```bash
git clone https://github.com/sowmyabommidi/shared-bill-splitter.git
```

Navigate to the project directory:

```bash
cd shared-bill-splitter
```

Install dependencies:

```bash
pnpm install
```

### Run the Application

Start the frontend and backend development servers:

```bash
pnpm dev
```

Open the frontend:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:8787
```

Health check endpoint:

```text
http://localhost:8787/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## API Endpoints

### 1. Create a Home

**POST** `/api/homes`

Request:

```json
{
  "name": "My Shared Home"
}
```

Success response: `201 Created`

```json
{
  "id": "home-id",
  "name": "My Shared Home"
}
```

### 2. Add a Member

**POST** `/api/homes/:homeId/members`

Request:

```json
{
  "name": "Sowmya"
}
```

Success response: `201 Created`

Returns the new member's ID, home ID, and name.

### 3. Create a Bill

**POST** `/api/homes/:homeId/bills`

Request:

```json
{
  "title": "Electricity Bill",
  "totalCents": 1000
}
```

Success response: `201 Created`

Returns the bill details and the individual shares created for the home's members.

### 4. Pay a Share

**POST** `/api/bills/:billId/shares/:shareId/pay`

Required header:

```text
Idempotency-Key: unique-payment-key
```

Success response: `200 OK`

Returns the share ID, member ID, amount in cents, and payment timestamp.

### 5. Get Home Balances

**GET** `/api/homes/:homeId/balances`

Success response: `200 OK`

Returns each member's outstanding unpaid amount in cents.

### 6. Get Home Details

**GET** `/api/homes/:homeId`

Returns the home, its members, and its bills with their share and payment details.

## Bill Splitting Logic

All monetary values are stored and processed as whole cents to avoid floating-point precision issues.

The bill is divided equally among all members. If the amount cannot be divided evenly, the remaining cents are distributed one by one in the order the members were added.

Example:

A bill of 1000 cents shared between 3 members:

| Member | Share |
|---|---:|
| Member 1 | 334 cents |
| Member 2 | 333 cents |
| Member 3 | 333 cents |
| **Total** | **1000 cents** |

This ensures that the sum of all shares always equals the original bill amount.

## Payment Handling

The payment API uses an `Idempotency-Key` header to prevent duplicate payments.

- Repeating a payment request with the same key returns the same payment result.
- A request with a different key for an already-paid share returns a conflict error.
- Conditional database updates help prevent two simultaneous requests from paying the same share twice.

## Database Design

The database schema is maintained using SQL migration files inside `api/migrations/`.

The initial migration creates the following tables:

- `homes` – stores shared home information.
- `members` – stores members belonging to each home and their insertion order.
- `bills` – stores bill information and total amounts.
- `shares` – stores each member's share and payment status.

Named database constraints protect data integrity through foreign keys, unique keys, and check constraints.

## Error Handling

API errors are returned in JSON format:

```json
{
  "error": "Error message"
}
```

The application handles invalid input, missing homes or bills, missing members, already-paid shares, and API failures.

The frontend displays loading, empty, and error states so that API failures or slow responses do not crash the page.

## Testing and Code Quality

Run the API tests:

```bash
pnpm test
```

Run Biome checks:

```bash
pnpm check
```

Automatically fix supported formatting and lint issues:

```bash
pnpm check:fix
```

Run TypeScript type checking:

```bash
pnpm typecheck
```

Build the frontend for production:

```bash
pnpm build
```

## Decisions

### 1. Store Money as Integer Cents

I chose to store all bill amounts and individual shares as integer cents instead of decimal values.

**Why:** Integer calculations avoid floating-point precision problems and ensure that the total of all shares always matches the original bill amount.

### 2. Use Database Constraints and Conditional Updates

I used named SQL constraints to protect relationships and valid data. For payments, I used idempotency keys and conditional database updates.

**Why:** These approaches help prevent invalid records, duplicate payments, and incorrect results when multiple payment requests happen at the same time.

### 3. Keep the Frontend and Backend Separate

I used React with TypeScript for the frontend and Hono on Cloudflare Workers for the API. The frontend communicates with the backend through a separate API client.

**Why:** Separating the frontend and backend makes the application easier to maintain, test, and extend.

## AI Tools Used

AI assistance was used during development for:

- Understanding the assignment requirements and planning the implementation.
- Guidance on React, TypeScript, Hono, and Cloudflare D1.
- Debugging and resolving development errors.
- Reviewing code and understanding test failures.
- Improving the README documentation.

I reviewed and tested the implementation and worked through the code to understand its functionality.

## Project Links

- **GitHub Repository:** https://github.com/sowmyabommidi/shared-bill-splitter
---

**Built as part of the SDE Intern Assignment – Shared Bill Splitter.**