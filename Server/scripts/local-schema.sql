-- For a NEW local development database only. Existing inventory data is untouched.
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CONSTRAINT stock_cannot_be_negative CHECK (stock >= 0),
  updated_at TIMESTAMP DEFAULT NOW(),
  price NUMERIC(10, 2) NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  manager_id INTEGER NOT NULL,
  change INTEGER NOT NULL,
  old_stock INTEGER NOT NULL CONSTRAINT old_stock_cannot_be_negative CHECK (old_stock >= 0),
  new_stock INTEGER NOT NULL CONSTRAINT new_stock_cannot_be_negative CHECK (new_stock >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);
