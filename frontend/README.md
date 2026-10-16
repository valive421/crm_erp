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
- For Render static hosting, configure a rewrite from `/*` to `/index.html` with status `200` so refreshing routes such as `/dashboard` or `/inventory` loads the SPA instead of returning a 404. The repository includes this rule in `render.yaml` and `public/_redirects`.
- The app uses hash-based routing (`/#/dashboard`) so direct refreshes remain reliable even when a static host has not applied its SPA rewrite rules.
