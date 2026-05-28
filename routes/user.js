const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/user/profile ─────────────────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT user_id, email, first_name, last_name, phone, role, created_at FROM users WHERE user_id = ?',
    [req.session.userId]
  );
  res.json({ success: true, user: rows[0] });
});

// ── PUT /api/user/profile ─────────────────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  await db.execute(
    'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?',
    [first_name, last_name, phone || null, req.session.userId]
  );
  req.session.firstName = first_name;
  req.session.lastName = last_name;
  res.json({ success: true, message: 'Profile updated.' });
});

// ── PUT /api/user/password ────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE user_id = ?', [req.session.userId]);
  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) return res.json({ success: false, message: 'Current password is incorrect.' });

  const hash = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.session.userId]);
  res.json({ success: true, message: 'Password updated.' });
});

// ── GET /api/user/addresses ───────────────────────────────────────────────────
router.get('/addresses', requireAuth, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, address_id ASC',
    [req.session.userId]
  );
  res.json({ success: true, addresses: rows });
});

// ── POST /api/user/addresses ──────────────────────────────────────────────────
router.post('/addresses', requireAuth, async (req, res) => {
  const { full_name, phone, street, barangay, city, province, zip_code, is_default } = req.body;
  if (!full_name || !street || !city || !province) {
    return res.json({ success: false, message: 'Full name, street, city, and province are required.' });
  }
  try {
    // If setting as default, unset others first
    if (is_default) {
      await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.session.userId]);
    }
    // If first address, auto-set as default
    const [existing] = await db.execute('SELECT COUNT(*) AS cnt FROM addresses WHERE user_id = ?', [req.session.userId]);
    const setDefault = is_default || existing[0].cnt === 0;

    const [result] = await db.execute(
      'INSERT INTO addresses (user_id, full_name, phone, street, barangay, city, province, zip_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.session.userId, full_name, phone || null, street, barangay || null, city, province, zip_code || null, setDefault ? 1 : 0]
    );
    res.json({ success: true, address_id: result.insertId });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── PUT /api/user/addresses/:id ───────────────────────────────────────────────
router.put('/addresses/:id', requireAuth, async (req, res) => {
  const { full_name, phone, street, barangay, city, province, zip_code, is_default } = req.body;
  try {
    if (is_default) {
      await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.session.userId]);
    }
    await db.execute(
      'UPDATE addresses SET full_name=?, phone=?, street=?, barangay=?, city=?, province=?, zip_code=?, is_default=? WHERE address_id=? AND user_id=?',
      [full_name, phone || null, street, barangay || null, city, province, zip_code || null, is_default ? 1 : 0, req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── DELETE /api/user/addresses/:id ───────────────────────────────────────────
router.delete('/addresses/:id', requireAuth, async (req, res) => {
  await db.execute(
    'DELETE FROM addresses WHERE address_id = ? AND user_id = ?',
    [req.params.id, req.session.userId]
  );
  res.json({ success: true });
});

// ── PUT /api/user/addresses/:id/default ──────────────────────────────────────
router.put('/addresses/:id/default', requireAuth, async (req, res) => {
  await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.session.userId]);
  await db.execute(
    'UPDATE addresses SET is_default = 1 WHERE address_id = ? AND user_id = ?',
    [req.params.id, req.session.userId]
  );
  res.json({ success: true });
});

module.exports = router;
