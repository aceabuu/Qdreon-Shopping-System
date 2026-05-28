-- ============================================================
--  Qdreon Online Shopping System — Database Schema (v2)
--  Updated for Node.js web version with full feature support
-- ============================================================

DROP DATABASE IF EXISTS qdreon_db;
CREATE DATABASE qdreon_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE qdreon_db;

-- ── Users ─────────────────────────────────────────────────
CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  phone          VARCHAR(30),
  role           ENUM('CUSTOMER','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  is_verified    TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Verification / Password-reset codes ──────────────────
-- Stores 6-digit OTP codes for email verification and password reset
CREATE TABLE verification_codes (
  code_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  code        CHAR(6) NOT NULL,
  type        ENUM('VERIFY','RESET') NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Addresses ─────────────────────────────────────────────
CREATE TABLE addresses (
  address_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  full_name    VARCHAR(200) NOT NULL,
  phone        VARCHAR(30),
  street       VARCHAR(255) NOT NULL,
  barangay     VARCHAR(100),
  city         VARCHAR(100) NOT NULL,
  province     VARCHAR(100) NOT NULL,
  zip_code     VARCHAR(20),
  is_default   TINYINT(1) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Categories ────────────────────────────────────────────
CREATE TABLE categories (
  category_id  INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE,
  description  TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Products ──────────────────────────────────────────────
CREATE TABLE products (
  product_id      INT AUTO_INCREMENT PRIMARY KEY,
  category_id     INT,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL,
  stock_quantity  INT NOT NULL DEFAULT 0,
  image_url       VARCHAR(500),
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Discount / Promo Codes ────────────────────────────────
CREATE TABLE promo_codes (
  promo_id          INT AUTO_INCREMENT PRIMARY KEY,
  code              VARCHAR(50) NOT NULL UNIQUE,
  description       VARCHAR(255),
  discount_type     ENUM('PERCENTAGE','FIXED') NOT NULL,
  discount_value    DECIMAL(10,2) NOT NULL,
  min_order_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses          INT,
  times_used        INT NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  expires_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Carts ─────────────────────────────────────────────────
CREATE TABLE carts (
  cart_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  status      ENUM('ACTIVE','CHECKED_OUT') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Cart Items ────────────────────────────────────────────
CREATE TABLE cart_items (
  cart_item_id  INT AUTO_INCREMENT PRIMARY KEY,
  cart_id       INT NOT NULL,
  product_id    INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  added_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart_product (cart_id, product_id),
  FOREIGN KEY (cart_id)    REFERENCES carts(cart_id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE orders (
  order_id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  address_id       INT,
  -- snapshot of shipping address at time of order
  shipping_name    VARCHAR(200),
  shipping_phone   VARCHAR(30),
  shipping_address TEXT,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_code       VARCHAR(50),
  total_amount     DECIMAL(10,2) NOT NULL,
  payment_method   VARCHAR(50) NOT NULL DEFAULT 'COD',
  payment_status   ENUM('PENDING','PAID','REFUNDED') NOT NULL DEFAULT 'PENDING',
  order_status     ENUM('PENDING','TO_SHIP','SHIPPING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  tracking_number  VARCHAR(100),
  notes            TEXT,
  placed_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(user_id)    ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Order Items ───────────────────────────────────────────
CREATE TABLE order_items (
  order_item_id  INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  product_id     INT,
  product_name   VARCHAR(255) NOT NULL,  -- snapshot in case product is deleted
  quantity       INT NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  line_total     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(order_id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Inventory Log ─────────────────────────────────────────
CREATE TABLE inventory_log (
  log_id           INT AUTO_INCREMENT PRIMARY KEY,
  product_id       INT NOT NULL,
  quantity_change  INT NOT NULL,
  reason           ENUM('PURCHASE','CANCELLED','RESTOCK','ADJUSTMENT') NOT NULL,
  reference_id     VARCHAR(50),
  logged_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_orders_user      ON orders(user_id);
CREATE INDEX idx_orders_status    ON orders(order_status);
CREATE INDEX idx_products_cat     ON products(category_id);
CREATE INDEX idx_cart_items_cart  ON cart_items(cart_id);
CREATE INDEX idx_ver_codes_user   ON verification_codes(user_id);
CREATE INDEX idx_addresses_user   ON addresses(user_id);
