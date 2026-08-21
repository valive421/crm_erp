CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(150) NOT NULL DEFAULT '',
  last_name VARCHAR(150) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OPERATIONS', 'SALES')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'UNIT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  batch_code VARCHAR(100) NOT NULL,
  received_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, batch_code)
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  location_id BIGINT NOT NULL REFERENCES locations(id),
  batch_id BIGINT NOT NULL REFERENCES batches(id),
  physical_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (physical_quantity >= 0),
  reserved_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= physical_quantity),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, location_id, batch_id)
);

CREATE TABLE IF NOT EXISTS work_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_number VARCHAR(50) NOT NULL UNIQUE,
  location_id BIGINT NOT NULL REFERENCES locations(id),
  item_id BIGINT NOT NULL REFERENCES items(id),
  required_quantity NUMERIC(14, 2) NOT NULL CHECK (required_quantity > 0),
  assigned_user_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_number VARCHAR(50) NOT NULL UNIQUE,
  source_location_id BIGINT NOT NULL REFERENCES locations(id),
  destination_location_id BIGINT NOT NULL REFERENCES locations(id),
  item_id BIGINT NOT NULL REFERENCES items(id),
  batch_id BIGINT NOT NULL REFERENCES batches(id),
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'DISPATCHED', 'RECEIVED')),
  requested_by_id BIGINT NOT NULL REFERENCES users(id),
  dispatched_by_id BIGINT REFERENCES users(id),
  received_by_id BIGINT REFERENCES users(id),
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_location_id <> destination_location_id)
);

CREATE TABLE IF NOT EXISTS customer_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('DRAFT', 'RESERVED', 'CANCELLED')),
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_order_id BIGINT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  inventory_id BIGINT NOT NULL REFERENCES inventory(id),
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_order_id, inventory_id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(id),
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('OPENING_BALANCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT', 'RESERVATION', 'RESERVATION_RELEASE')),
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  idempotency_key VARCHAR(100) NOT NULL UNIQUE,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_item_location_idx ON inventory (item_id, location_id);
CREATE INDEX IF NOT EXISTS work_orders_location_status_idx ON work_orders (location_id, status);
CREATE INDEX IF NOT EXISTS internal_transfers_status_idx ON internal_transfers (status);
CREATE INDEX IF NOT EXISTS customer_orders_status_idx ON customer_orders (status);
