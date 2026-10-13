CREATE TABLE IF NOT EXISTS accounts_user (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  password TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
  username VARCHAR(150) NOT NULL UNIQUE,
  first_name VARCHAR(150) NOT NULL DEFAULT '',
  last_name VARCHAR(150) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL DEFAULT '',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products_category (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products_warehouse (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers_customer (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  mobile_number VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL DEFAULT '',
  business_name VARCHAR(200) NOT NULL DEFAULT '',
  gst_number VARCHAR(50),
  customer_type VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL',
  address TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'LEAD',
  follow_up_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_by_id BIGINT NOT NULL REFERENCES accounts_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers_customerfollowup (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers_customer(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by_id BIGINT NOT NULL REFERENCES accounts_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products_product (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  category_id BIGINT NOT NULL REFERENCES products_category(id),
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock_alert_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (minimum_stock_alert_quantity >= 0),
  warehouse_id BIGINT NOT NULL REFERENCES products_warehouse(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_stockmovement (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products_product(id),
  quantity_changed NUMERIC(14, 2) NOT NULL CHECK (quantity_changed > 0),
  movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  reason TEXT NOT NULL DEFAULT '',
  created_by_id BIGINT NOT NULL REFERENCES accounts_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challans_saleschallan (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challan_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL REFERENCES customers_customer(id),
  total_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  created_by_id BIGINT NOT NULL REFERENCES accounts_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challans_saleschallanitem (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challan_id BIGINT NOT NULL REFERENCES challans_saleschallan(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products_product(id),
  product_id_snapshot BIGINT NOT NULL,
  product_name_snapshot VARCHAR(200) NOT NULL,
  sku_snapshot VARCHAR(80) NOT NULL,
  unit_price_snapshot NUMERIC(14, 2) NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS customers_customer_status_idx ON customers_customer(status);
CREATE INDEX IF NOT EXISTS products_product_category_idx ON products_product(category_id);
CREATE INDEX IF NOT EXISTS products_product_warehouse_idx ON products_product(warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_stockmovement_product_idx ON inventory_stockmovement(product_id);
CREATE INDEX IF NOT EXISTS challans_saleschallan_status_idx ON challans_saleschallan(status);
