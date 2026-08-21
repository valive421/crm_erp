# Mini Operations ERP Backend

Node.js and Express backend for the Mini Operations ERP portal.

## Quick Start
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure PostgreSQL and JWT secrets.
3. Create the Operations ERP schema with `npm run db:init`.
4. Run the demo seed script with `npm run seed`.
5. Start the API server.

## Commands
```bash
npm run db:init
npm run seed
npm run dev
npm test
```

## Demo Accounts
- admin / demo password configured in the seed script
- sales1 / demo password configured in the seed script
- operations1 / demo password configured in the seed script

## Main Endpoints
- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/meta/categories`
- `/api/meta/locations`
- `/api/meta/assignable-users`
- `GET /api/inventory`
- `GET /api/inventory/transactions`
- `POST /api/inventory/adjustments`
- `GET, POST /api/work-orders`
- `PATCH /api/work-orders/:id/status`
- `GET, POST /api/transfers`
- `POST /api/transfers/:id/dispatch`
- `POST /api/transfers/:id/receive`
- `GET, POST /api/orders`
- `POST /api/orders/:id/cancel`
- `/api/health`

## Deployment Notes
- Run `npm install`
- Run `npm run db:init`
- Run `npm run seed`
- Start with `npm start`

## Business Rules
- Available quantity is always `physical_quantity - reserved_quantity`.
- Stock changes and reservations run in PostgreSQL transactions with row-level locks.
- A transfer decreases source stock on dispatch and increases destination stock only on receipt.
- A received transfer cannot be received again.
- Sales reservations cannot exceed currently available inventory; cancelling a reserved order releases its quantity.

## Tests
Set `TEST_DATABASE_URL` to a disposable PostgreSQL database, then run `npm test`. The integration suite covers reservation limits, transfer limits, receipt timing, duplicate receipt prevention, and authorization.

## Documentation
- API contract: `docs/API.md`
- ER diagram source: `docs/operations-erp.dbml`
