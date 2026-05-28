const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[revenue]]     = await db.execute('SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE order_status != "CANCELLED"');
    const [[orderCount]]  = await db.execute('SELECT COUNT(*) AS cnt FROM orders');
    const [[userCount]]   = await db.execute('SELECT COUNT(*) AS cnt FROM users WHERE role = "CUSTOMER"');
    const [[productCount]]= await db.execute('SELECT COUNT(*) AS cnt FROM products WHERE is_active = 1');
    const [recentOrders]  = await db.execute(
      `SELECT o.order_id, CONCAT(u.first_name,' ',u.last_name) AS name, o.total_amount, o.order_status, o.placed_at
       FROM orders o JOIN users u ON o.user_id = u.user_id ORDER BY o.placed_at DESC LIMIT 5`
    );
    res.json({ success: true, stats: {
      revenue: revenue.total,
      orders: orderCount.cnt,
      users: userCount.cnt,
      products: productCount.cnt
    }, recentOrders });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const [rows] = await db.execute(
    'SELECT user_id, email, first_name, last_name, phone, role, is_active, is_verified, created_at FROM users ORDER BY user_id'
  );
  res.json({ success: true, users: rows });
});

// ── PUT /api/admin/users/:id/ban ──────────────────────────────────────────────
router.put('/users/:id/ban', async (req, res) => {
  const [user] = await db.execute('SELECT role FROM users WHERE user_id = ?', [req.params.id]);
  if (user[0]?.role === 'ADMIN') return res.json({ success: false, message: 'Cannot ban an admin.' });
  await db.execute('UPDATE users SET is_active = 0 WHERE user_id = ?', [req.params.id]);
  res.json({ success: true });
});

router.put('/users/:id/unban', async (req, res) => {
  await db.execute('UPDATE users SET is_active = 1 WHERE user_id = ?', [req.params.id]);
  res.json({ success: true });
});

router.put('/users/:id/promote', async (req, res) => {
  await db.execute('UPDATE users SET role = "ADMIN" WHERE user_id = ? AND role = "CUSTOMER"', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
