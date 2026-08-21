# Operations ERP API

All endpoints except login, refresh, and health require `Authorization: Bearer <access-token>`.

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Return access and refresh tokens |
| GET | `/api/inventory` | Admin, Operations, Sales | Inventory by item, location, and batch |
| POST | `/api/inventory/adjustments` | Admin, Operations | Record stock in/out adjustment |
| GET/POST | `/api/work-orders` | List: Admin/Operations; Create: Admin | Work orders and shortage calculation |
| PATCH | `/api/work-orders/:id/status` | Admin, Operations | Move work order through its status |
| GET/POST | `/api/transfers` | Admin, Operations | List/request an internal transfer |
| POST | `/api/transfers/:id/dispatch` | Admin, Operations | Deduct source stock |
| POST | `/api/transfers/:id/receive` | Admin, Operations | Increase destination stock once |
| GET/POST | `/api/orders` | Admin, Sales | List/create customer reservations |
| POST | `/api/orders/:id/cancel` | Admin, Sales | Cancel and release reservation |

## Key request bodies

```json
POST /api/inventory/adjustments
{
  "inventory_id": 1,
  "direction": "IN",
  "quantity": 5,
  "idempotency_key": "unique-client-request-id"
}
```

```json
POST /api/transfers
{
  "source_location_id": 1,
  "destination_location_id": 2,
  "item_id": 1,
  "batch_id": 1,
  "quantity": 5
}
```

```json
POST /api/orders
{
  "customer_name": "Example Customer",
  "idempotency_key": "unique-order-request-id",
  "items": [{ "inventory_id": 1, "quantity": 5 }]
}
```

Business validation failures return `400`; duplicate/invalid state transitions return `409`; missing authentication returns `401`; prohibited roles return `403`.
