# Mini ERP + CRM Backend

Node.js and Express backend for the Mini ERP + CRM operations portal.

## Quick Start
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure PostgreSQL and JWT secrets.
3. Run the demo seed script.
4. Start the API server.

## Commands
```bash
npm run seed
npm run dev
```

## Demo Accounts
- admin / Admin@12345
- sales1 / Sales@12345
- warehouse1 / Warehouse@12345
- accounts1 / Accounts@12345

## Main Endpoints
- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/dashboard`
- `/api/customers`
- `/api/customers/:id/follow-ups`
- `/api/products`
- `/api/products/meta/categories`
- `/api/products/meta/warehouses`
- `/api/inventory`
- `/api/inventory/movements`
- `/api/challans`
- `/api/challans/:id/confirm`
- `/api/challans/:id/cancel`
- `/api/health`

## Deployment Notes
- Run `npm install`
- Run `npm run seed`
- Start with `npm start`

## Business Rules
- Draft challans do not reduce stock.
- Confirmed challans reduce stock transactionally.
- Insufficient stock raises a 400 error and rolls back the entire challan confirmation.
