const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Helper: get or create user's active cart
async function getCartId(userId) {
  let [rows] = await db.execute(
    'SELECT cart_id FROM carts WHERE user_id = ? AND status = "ACTIVE"',
    [userId]
  );
  if (rows.length === 0) {
    const [result] = await db.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    return result.insertId;
  }
  return rows[0].cart_id;
}

// ── GET /api/cart ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const cartId = await getCartId(req.session.userId);
    const [items] = await db.execute(
      `SELECT ci.cart_item_id, ci.quantity, ci.unit_price,
              p.product_id, p.name, p.image_url, p.stock_quantity, p.price AS current_price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.product_id
       WHERE ci.cart_id = ?`,
      [cartId]
    );
    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    res.json({ success: true, items, total, count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to load cart.' });
  }
});

// ── POST /api/cart/add ────────────────────────────────────────────────────────
router.post('/add', requireAuth, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  try {
    const [products] = await db.execute(
      'SELECT * FROM products WHERE product_id = ? AND is_active = 1',
      [product_id]
    );
    if (products.length === 0) return res.json({ success: false, message: 'Product not found.' });
    const product = products[0];
    if (product.stock_quantity <= 0) return res.json({ success: false, message: 'Out of stock.' });

    const cartId = await getCartId(req.session.userId);

    // Check existing cart item
    const [existing] = await db.execute(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, product_id]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + parseInt(quantity);
      if (newQty > product.stock_quantity) {
        return res.json({ success: false, message: 'Not enough stock.' });
      }
      await db.execute(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
        [newQty, existing[0].cart_item_id]
      );
    } else {
      await db.execute(
        'INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [cartId, product_id, quantity, product.price]
      );
    }

    // Return updated count
    const [countRow] = await db.execute(
      'SELECT SUM(quantity) AS cnt FROM cart_items WHERE cart_id = ?',
      [cartId]
    );
    res.json({ success: true, message: 'Added to cart!', count: countRow[0].cnt || 0 });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to add to cart.' });
  }
});

// ── PUT /api/cart/update ──────────────────────────────────────────────────────
router.put('/update', requireAuth, async (req, res) => {
  const { product_id, quantity } = req.body;
  try {
    const cartId = await getCartId(req.session.userId);
    if (quantity <= 0) {
      await db.execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, product_id]);
    } else {
      // Verify stock
      const [products] = await db.execute('SELECT stock_quantity FROM products WHERE product_id = ?', [product_id]);
      if (products.length > 0 && quantity > products[0].stock_quantity) {
        return res.json({ success: false, message: 'Not enough stock.' });
      }
      await db.execute(
        'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
        [quantity, cartId, product_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Update failed.' });
  }
});

// ── DELETE /api/cart/remove/:productId ───────────────────────────────────────
router.delete('/remove/:productId', requireAuth, async (req, res) => {
  try {
    const cartId = await getCartId(req.session.userId);
    await db.execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, req.params.productId]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// ── GET /api/cart/count ───────────────────────────────────────────────────────
router.get('/count', requireAuth, async (req, res) => {
  try {
    const cartId = await getCartId(req.session.userId);
    const [rows] = await db.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS cnt FROM cart_items WHERE cart_id = ?',
      [cartId]
    );
    res.json({ count: rows[0].cnt });
  } catch {
    res.json({ count: 0 });
  }
});

module.exports = router;
