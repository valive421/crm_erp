# Mini ERP + CRM Frontend

React Vite frontend for the Mini ERP + CRM operations portal.

## Features
- Role-aware sidebar navigation
- JWT login and session hydration
- Dashboard cards and tables
- Customer, product, inventory, and challan screens
- Responsive admin-style layout

## Local Setup
```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Environment
- `VITE_API_BASE_URL=http://localhost:8000/api`

## API Contract
The frontend expects the Express backend under the `/api` prefix.

## Notes
- Authentication tokens are stored in browser storage for the demo build.
- Update the API base URL when deploying the backend.
