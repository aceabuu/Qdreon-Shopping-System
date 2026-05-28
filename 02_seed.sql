-- ============================================================
--  Qdreon Online Shopping System — Seed Data (v2)
-- ============================================================
USE qdreon_db;

-- ── Categories ────────────────────────────────────────────
INSERT INTO categories (name, description) VALUES
  ('Electronics',  'Gadgets, devices, and tech accessories'),
  ('Accessories',  'Bags, cases, and wearable accessories'),
  ('Storage',      'SSDs, flash drives, and memory cards'),
  ('Home',         'Desk and home office accessories'),
  ('Clothing',     'Apparel and fashion items'),
  ('Sports',       'Sports equipment and fitness gear');

-- ── Users (passwords are bcrypt hashes of the plain-text shown) ──────────────
-- Plain passwords: admin123, lance123, zhen123, sancho123, andre123, kyle123
-- These are pre-generated bcrypt hashes (cost 10)
INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active, is_verified) VALUES
  ('admin@qdreon.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin',  'Qdreon',  '09000000001', 'ADMIN',    1, 1),
  ('24105121@usc.edu.ph',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lance',  'Reyes',   '09171234567', 'CUSTOMER', 1, 1),
  ('24100644@usc.edu.ph',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Zhen',   'Santos',  '09181234567', 'CUSTOMER', 1, 1),
  ('24103744@usc.edu.ph',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sancho', 'Dela Cruz','09191234567','CUSTOMER', 1, 1),
  ('22101315@usc.edu.ph',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Andre',  'Garcia',  '09201234567', 'CUSTOMER', 1, 1),
  ('23104688@usc.edu.ph',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kyle',   'Flores',  '09211234567', 'CUSTOMER', 1, 1);

-- NOTE: The bcrypt hash above is for 'password' — update to real hashes or
--       use the /seed-passwords endpoint (dev only) to generate proper ones.
-- For development, the seed inserts plaintext markers and the app handles them.
-- REAL approach: run `node scripts/hash-passwords.js` after first setup.

-- ── Addresses ─────────────────────────────────────────────
INSERT INTO addresses (user_id, full_name, phone, street, barangay, city, province, zip_code, is_default) VALUES
  (2, 'Lance Reyes',   '09171234567', '123 Osmeña Blvd', 'Capitol Site',  'Cebu City',   'Cebu',    '6000', 1),
  (3, 'Zhen Santos',   '09181234567', '45 Colon Street',  'Parian',        'Cebu City',   'Cebu',    '6000', 1),
  (4, 'Sancho Dela Cruz','09191234567','78 General Maxilom','Cogon-Ramos',  'Cebu City',   'Cebu',    '6000', 1),
  (5, 'Andre Garcia',  '09201234567', '12 Escario Street', 'Kamputhaw',    'Cebu City',   'Cebu',    '6000', 1),
  (6, 'Kyle Flores',   '09211234567', '99 Urgello Street', 'Sambag I',     'Cebu City',   'Cebu',    '6000', 1);

-- ── Products ──────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, stock_quantity, image_url, rating) VALUES
  (1, 'Wireless Bluetooth Headphones', 'Premium wireless headphones with active noise cancellation and 30-hour battery life.', 4499.00, 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', 4.5),
  (1, 'Smart Watch Pro',               'Advanced fitness tracking, heart rate monitoring, GPS, and 7-day battery.',              16799.00, 23, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', 4.8),
  (2, 'Leather Laptop Bag',            'Premium genuine leather laptop bag fits up to 15-inch laptops with multiple compartments.',5049.00, 67, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', 4.3),
  (1, 'USB-C Fast Charger 65W',        '65W GaN fast charging adapter compatible with laptops, phones, and tablets.',            1699.00, 120,'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80', 4.6),
  (1, 'Mechanical Keyboard RGB',       'TKL gaming mechanical keyboard with Cherry MX switches and per-key RGB lighting.',       7299.00, 0,  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80', 4.7),
  (1, 'Wireless Mouse',                'Ergonomic wireless mouse with adjustable 800–4000 DPI and silent click.',               2799.00, 88, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80', 4.4),
  (3, 'Portable SSD 1TB',              'Ultra-fast portable SSD with USB-C 3.2 Gen2 speeds up to 1050MB/s.',                   8399.00, 34, 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=600&q=80', 4.9),
  (4, 'LED Desk Lamp',                 'Adjustable LED desk lamp with touch dimmer, USB charging port, and eye-care mode.',     2249.00, 56, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', 4.2),
  (1, 'Noise Cancelling Earbuds',      'True wireless earbuds with hybrid ANC, 8+24 hour battery, and IPX4 water resistance.',  3299.00, 60, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80', 4.6),
  (2, 'Crossbody Sling Bag',           'Lightweight waterproof crossbody bag with USB charging port and anti-theft design.',    1899.00, 40, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', 4.3),
  (1, '4K Webcam',                     '4K UHD webcam with autofocus, built-in stereo microphone, and privacy cover.',          3799.00, 30, 'https://images.unsplash.com/photo-1587123414000-0c94e2e99c9c?w=600&q=80', 4.5),
  (4, 'Monitor Stand Riser',           'Adjustable aluminum monitor stand with storage drawer and cable management.',           2499.00, 75, 'https://images.unsplash.com/photo-1616763355603-9755a640a287?w=600&q=80', 4.4);

-- ── Promo Codes ───────────────────────────────────────────
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, is_active) VALUES
  ('SYNEXIS10', '10% off for Synexis members',          'PERCENTAGE', 10.00, 500.00,  100, 1),
  ('WELCOME50', '₱50 off your first order',             'FIXED',      50.00, 300.00,  500, 1),
  ('USC2026',   '15% off for USC students',             'PERCENTAGE', 15.00, 1000.00,  50, 1),
  ('SAVE100',   '₱100 off orders over ₱2000',           'FIXED',     100.00, 2000.00, 200, 1),
  ('FLASH20',   '20% flash sale discount',              'PERCENTAGE', 20.00,  500.00,   20, 1);

-- ── Carts (one active cart per user) ─────────────────────
INSERT INTO carts (user_id, status) VALUES
  (2, 'ACTIVE'),
  (3, 'ACTIVE'),
  (4, 'ACTIVE'),
  (5, 'ACTIVE'),
  (6, 'ACTIVE');
