const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, category, sort } = req.query;
  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1`;
  const params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }

  const sortMap = {
    'price-asc':  'p.price ASC',
    'price-desc': 'p.price DESC',
    'rating':     'p.rating DESC',
    'newest':     'p.created_at DESC',
  };
  sql += ' ORDER BY ' + (sortMap[sort] || 'p.product_id ASC');

  try {
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to load products.' });
  }
});

// ── GET /api/products/categories ─────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM categories ORDER BY name');
  res.json({ success: true, categories: rows });
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.category_id
     WHERE p.product_id = ? AND p.is_active = 1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.json({ success: false, message: 'Product not found.' });
  res.json({ success: true, product: rows[0] });
});

// ── POST /api/products (admin) ────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { category_id, name, description, price, stock_quantity, image_url } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO products (category_id, name, description, price, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, name, description, price, stock_quantity, image_url]
    );
    res.json({ success: true, product_id: result.insertId });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── PUT /api/products/:id (admin) ─────────────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { category_id, name, description, price, stock_quantity, image_url } = req.body;
  try {
    await db.execute(
      'UPDATE products SET category_id=?, name=?, description=?, price=?, stock_quantity=?, image_url=? WHERE product_id=?',
      [category_id, name, description, price, stock_quantity, image_url, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── DELETE /api/products/:id (admin) ─────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await db.execute('UPDATE products SET is_active = 0 WHERE product_id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
