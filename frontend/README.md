# Mini Operations ERP Frontend

React Vite frontend for the Mini Operations ERP portal.

## Features
- Role-aware operations navigation
- JWT login and session hydration
- Inventory, work order, transfer, and customer-order screens
- Responsive operations layout

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
The frontend expects the Express backend under the `/api` prefix. Operational screens are introduced incrementally across the project commits.

## Notes
- Authentication tokens are stored in browser storage for the demo build.
- Update the API base URL when deploying the backend.
