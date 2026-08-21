# Mini Operations ERP

A production-oriented full-stack Operations ERP for managing inventory across locations, work orders, internal transfers, and customer stock reservations.

# Live Link
https://fronend-crm-erp.onrender.com

## Business flow

```text
Inventory → Work Order → Stock Check → Internal Transfer / Shortage → Customer Reservation
```

## Technology stack

- Frontend: React 18, Vite, React Router, Axios
- Backend: Node.js, Express 5, PostgreSQL (`pg`)
- Security: JWT, bcrypt, Helmet, CORS
- Testing: Node.js built-in test runner with PostgreSQL integration tests

## Modules

- JWT login, refresh, logout, and current-user API
- Roles: `ADMIN`, `OPERATIONS`, `SALES`
- Inventory by item, category, location, and batch
- Physical, reserved, and calculated available stock
- Transactional stock adjustments with idempotency keys
- Work orders with automatic shortage calculation
- Internal transfers: Requested → Dispatched → Received
- Customer orders that reserve available stock
- Customer-order cancellation that releases reserved stock

## Quick start

### 1. Configure the backend

```powershell
cd backend
copy .env.example .env
npm install
npm run db:init
npm run seed
npm run dev
```

### 2. Configure the frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

The default local URLs are:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`

## Environment variables

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `PORT` | Backend listening port |
| `NODE_ENV` | Runtime environment |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime |
| `CORS_ORIGIN` | One or more comma-separated frontend origins, or `*` for development |

Frontend (`frontend/.env`):

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL, for example `http://localhost:8000/api` |

## Demo users

After `npm run seed`, use the accounts defined in `backend/scripts/seedDemo.js`:

| Role | Username |
|---|---|
| Admin | `admin` |
| Operations User | `operations1` |
| Sales User | `sales1` |

Use only the seed-script passwords in a local/demo environment. Do not use those credentials in production.

## Tests

The required integration suite uses a **disposable PostgreSQL database**:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://...your-disposable-test-database...'
npm test
```

The suite verifies reservation limits, transfer limits, receipt timing, repeated-receipt prevention, and authorization. It intentionally skips when `TEST_DATABASE_URL` is absent so it cannot modify a normal development database accidentally.

## Documentation

Read [DOCUMENTATION.md](DOCUMENTATION.md) for architecture, role permissions, business rules, database design, API/Postman instructions, testing, deployment, and a file map.

Database ERD source for dbdiagram.io: [backend/docs/operations-erp.dbml](backend/docs/operations-erp.dbml)

API reference: [backend/docs/API.md](backend/docs/API.md)
