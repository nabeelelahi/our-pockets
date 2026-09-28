# Our Pockets — shared household budget

A mobile-first budgeting PWA for two spouses. Set a monthly income, split it into
categories (envelopes), record expenses, and both of you see the same balances.

> "I spent PKR 2,500 on Food" → "Saved. You now have PKR 37,500 left for Food & Groceries."

Runs at **$0/month** on the Vercel Hobby tier and a MongoDB Atlas M0 (free) cluster.
There's no email provider, bank integration or paid API.

## Stack

- Next.js 16 (App Router, Server Components, Server Actions), TypeScript, Tailwind CSS 4
- MongoDB Atlas + Mongoose
- Email/password auth: bcrypt hashes, HS256 JWT (`jose`) in an HTTP-only cookie
- Zod validation, Vitest + mongodb-memory-server tests

## Project layout

```
src/
  app/               routes: (auth) login/register, (app) dashboard/transactions/budget/settings,
                     onboarding, invite/[token], manifest, icons
  actions/           server actions: thin wrappers that authenticate and call services
  services/          business logic + authorization (household derived from the user)
  models/            Mongoose schemas and indexes
  lib/               money, dates, budget math, validation, db connection, auth helpers
  components/        UI (ui/, dashboard/, transactions/, budget/, household/, layout/, pwa/)
  proxy.ts           optimistic route protection (redirects logged-out visitors)
tests/               unit, auth, budget-calculation and authorization tests
scripts/             seed data and an optional throwaway local MongoDB
public/              service worker + offline page
```

## Key design decisions

- **Money is integers.** Whole currency units (PKR 2,500 → `2500`). Input like `2.5`, `-10` or `2500abc` is rejected on the server.
- **Dates are calendar strings.** Expenses store `transactionDate` as `YYYY-MM-DD` in the household timezone (default `Asia/Karachi`), so they never shift a day through UTC conversion. Budgets are keyed by `YYYY-MM`. The expense date decides which month's budget it belongs to.
- **Balances are computed, not stored.** Spent amounts are aggregated from transactions, so edits, deletes and category moves are always reflected correctly.
- **Authorization lives in services.** Every service derives the household from the authenticated user id. It never trusts a client-supplied household id, and every lookup is scoped by `householdId`. Records from another household behave exactly like missing ones.
- **Membership is embedded** in the household (`members: [{ userId, role }]`). A unique index on `members.userId` enforces one household per user, and a guarded `$push` enforces the two-member limit.
- **Invitations** are 256-bit random tokens. Only a SHA-256 hash is stored. They expire after 7 days and are claimed atomically, so each works once. Creating a new link voids the old one.
- **Roles:** both members manage budgets, categories and expenses. Only the owner changes household settings, invites, or removes the spouse.
- **Overspending is allowed and shown**, never blocked. Over-allocation shows a warning.
- **No rollover** in the MVP. "Copy from previous month" copies income and allocations only.
- **Freshness without WebSockets.** Pages are server-rendered on each request and refresh when the app returns to the foreground, so each spouse sees the other's latest expenses.

## Local development

Requires Node.js 20.9+ (22 recommended).

```bash
npm install
cp .env.example .env.local    # then fill in the values
npm run dev                   # http://localhost:3000
```

`.env.local` needs:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string, including the database name |
| `JWT_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_APP_URL` | Base URL used in invitation links, e.g. `http://localhost:3000` |

**Database options for development:**

1. A free Atlas cluster (see below). Using a separate database name from production is recommended.
2. A local `mongod`: `MONGODB_URI=mongodb://127.0.0.1:27017/our-pockets`.
3. A throwaway in-memory server, `npm run db:local`. It prints its URI (the port may differ if 27017 is taken), and the data is lost when it stops.

### Demo data

```bash
npm run seed
```

This creates the household "Nabeel & Wife" with a September 2026 budget (income PKR 300,000) and sample expenses:

| Email | Password |
| --- | --- |
| `nabeel@example.com` | `password123` |
| `wife@example.com` | `password123` |

These are **development credentials only**. The seed refuses to run with `NODE_ENV=production`, and must never be run against the production database.

### Checks

```bash
npm run lint
npm run typecheck
npm test          # starts an in-memory MongoDB (downloads a binary on first run)
npm run build
```

## Deployment ($0: Vercel Hobby + MongoDB Atlas M0)

### 1. MongoDB Atlas

1. Create a free account at <https://www.mongodb.com/cloud/atlas>.
2. Create a **free M0 cluster**.
3. **Database Access** → add a database user with a strong password (role: *Read and write to any database*).
4. **Network Access** → add `0.0.0.0/0`. Vercel's free tier has no fixed outbound IPs, so this is required. Access is still protected by the database user's credentials.
5. **Connect → Drivers** → copy the connection string and add a database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/our-pockets?retryWrites=true&w=majority`

Indexes, including the unique ones that enforce data integrity, are created automatically when the app first connects.

### 2. Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repository. The framework is detected as Next.js, and no build settings need changing.
3. Add environment variables for Production, and Preview if you use it:
   - `MONGODB_URI`: the Atlas string from above
   - `JWT_SECRET`: a newly generated random value (never reuse your development secret)
   - `NEXT_PUBLIC_APP_URL`: `https://<your-project>.vercel.app`
4. Deploy. If you set `NEXT_PUBLIC_APP_URL` after the first deploy, redeploy, because it's embedded at build time.

### 3. Verify production

- Register, log out, and log in again (the session cookie is `Secure`, `HttpOnly`, `SameSite=Lax`).
- Create the household, create an invitation link, and open it on the second phone to register and accept.
- Set the income and allocations, add an expense, check that the other phone shows it, then edit and delete it.

### 4. Install on phones

- **Android (Chrome):** open the site → menu → *Install app* / *Add to Home screen*.
- **iPhone/iPad (Safari):** Share → *Add to Home Screen*.

The app opens standalone. The service worker caches only static assets and an offline page. Budget data is never cached on the device, and the app needs a connection to load or save.

## Security checklist

- [x] Passwords hashed with bcrypt (cost 12). Hashes are never selected or returned.
- [x] JWT carries only the user id (`sub`), is signed with `JWT_SECRET`, and lasts 30 days. It is stored in an `HttpOnly` cookie, `Secure` in production.
- [x] All authorization is server-side. Household isolation is covered by tests (`tests/authorization.test.ts`).
- [x] Zod validates every input server-side. Ids are checked before queries, and search text is regex-escaped.
- [x] Invitation tokens are random, hashed, expiring and single-use.
- [x] Errors are sanitized. Only user-safe messages reach the client, and server logs contain no financial data.
- [x] Duplicate submissions are blocked (a pending-state guard disables the submit button).
- [x] `.env*` is git-ignored except `.env.example`.

Note: logout clears the cookie. Because sessions are stateless JWTs, a copied token stays valid until it expires (30 days).

## Not in the MVP (by design)

Recurring expenses, rollover, multiple income sources, bank imports, investments, notifications,
receipts, offline sync, and real-time updates. The service layer is structured so these can be added later.
