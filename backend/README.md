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
npm run seed
npm run dev
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
- `/api/health`

## Deployment Notes
- Run `npm install`
- Run `npm run db:init`
- Run `npm run seed`
- Start with `npm start`

## Development Status
The inventory stage provides location- and batch-level physical, reserved, and calculated available quantity. Manual adjustments are transactionally locked, cannot make available inventory negative, and require a unique idempotency key. Work orders, internal transfers, and customer reservations follow in later development stages.
