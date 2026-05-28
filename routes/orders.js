const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const emailSvc = require('../config/email');

// ── POST /api/orders/validate-promo ──────────────────────────────────────────
router.post('/validate-promo', requireAuth, async (req, res) => {
  const { code, subtotal } = req.body;
  try {
    const [rows] = await db.execute(
      `SELECT * FROM promo_codes
       WHERE code = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR times_used < max_uses)`,
      [code.toUpperCase()]
    );
    if (rows.length === 0) return res.json({ valid: false, message: 'Invalid or expired promo code.' });
    const promo = rows[0];
    if (subtotal < promo.min_order_amount) {
      return res.json({ valid: false, message: `Minimum order of ₱${promo.min_order_amount.toLocaleString()} required.` });
    }
    let discount = promo.discount_type === 'PERCENTAGE'
      ? (subtotal * promo.discount_value / 100)
      : promo.discount_value;
    discount = Math.min(discount, subtotal); // cap at subtotal

    res.json({
      valid: true,
      discount: parseFloat(discount.toFixed(2)),
      promo_id: promo.promo_id,
      description: promo.description,
      message: `Code applied: ${promo.description || promo.code}`
    });
  } catch (err) {
    res.json({ valid: false, message: 'Could not validate code.' });
  }
});

// ── POST /api/orders/checkout ─────────────────────────────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  const { address_id, payment_method = 'COD', promo_code, notes } = req.body;
  const userId = req.session.userId;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Get cart
    const [carts] = await conn.execute(
      'SELECT cart_id FROM carts WHERE user_id = ? AND status = "ACTIVE"',
      [userId]
    );
    if (carts.length === 0) { await conn.rollback(); return res.json({ success: false, message: 'No active cart.' }); }
    const cartId = carts[0].cart_id;

    // 2. Load cart items
    const [items] = await conn.execute(
      `SELECT ci.*, p.name, p.stock_quantity FROM cart_items ci
       JOIN products p ON ci.product_id = p.product_id WHERE ci.cart_id = ?`,
      [cartId]
    );
    if (items.length === 0) { await conn.rollback(); return res.json({ success: false, message: 'Cart is empty.' }); }

    // 3. Check stock
    for (const item of items) {
      if (item.quantity > item.stock_quantity) {
        await conn.rollback();
        return res.json({ success: false, message: `"${item.name}" has insufficient stock.` });
      }
    }

    // 4. Resolve address - use saved address or get default
    let resolvedAddressId = address_id;
    if (!resolvedAddressId) {
      const [defaultAddr] = await conn.execute(
        'SELECT address_id FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1',
        [userId]
      );
      if (defaultAddr.length > 0) resolvedAddressId = defaultAddr[0].address_id;
    }
    if (!resolvedAddressId) { await conn.rollback(); return res.json({ success: false, message: 'Please add a shipping address first.' }); }

    // 5. Get address details for snapshot
    const [addrs] = await conn.execute('SELECT * FROM addresses WHERE address_id = ?', [resolvedAddressId]);
    if (addrs.length === 0) { await conn.rollback(); return res.json({ success: false, message: 'Address not found.' }); }
    const addr = addrs[0];
    const addrText = `${addr.full_name}, ${addr.street}${addr.barangay ? ', ' + addr.barangay : ''}, ${addr.city}, ${addr.province} ${addr.zip_code || ''}`.trim();

    // 6. Compute subtotal
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    // 7. Apply promo
    let discountAmount = 0;
    let appliedPromoCode = null;
    if (promo_code) {
      const [promos] = await conn.execute(
        `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR times_used < max_uses)`,
        [promo_code.toUpperCase()]
      );
      if (promos.length > 0 && subtotal >= promos[0].min_order_amount) {
        const p = promos[0];
        discountAmount = p.discount_type === 'PERCENTAGE'
          ? (subtotal * p.discount_value / 100) : p.discount_value;
        discountAmount = Math.min(discountAmount, subtotal);
        appliedPromoCode = p.code;
        await conn.execute('UPDATE promo_codes SET times_used = times_used + 1 WHERE promo_id = ?', [p.promo_id]);
      }
    }
    const total = parseFloat((subtotal - discountAmount).toFixed(2));

    // 8. Insert order
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (user_id, address_id, shipping_name, shipping_phone, shipping_address,
         subtotal, discount_amount, promo_code, total_amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, resolvedAddressId, addr.full_name, addr.phone, addrText,
       subtotal, discountAmount, appliedPromoCode, total, payment_method, notes || null]
    );
    const orderId = orderResult.insertId;

    // 9. Insert order items + deduct stock
    for (const item of items) {
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.name, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
      await conn.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
      await conn.execute(
        'INSERT INTO inventory_log (product_id, quantity_change, reason, reference_id) VALUES (?, ?, "PURCHASE", ?)',
        [item.product_id, -item.quantity, String(orderId)]
      );
    }

    // 10. Clear / reset cart
    await conn.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await conn.execute('UPDATE carts SET status = "CHECKED_OUT" WHERE cart_id = ?', [cartId]);
    // Check if an ACTIVE cart already exists before creating one
    const [existingCart] = await conn.execute('SELECT cart_id FROM carts WHERE user_id = ? AND status = "ACTIVE"', [userId]);
    if (existingCart.length === 0) {
    await conn.execute('INSERT INTO carts (user_id, status) VALUES (?, "ACTIVE")', [userId]);
    }

    await conn.commit();

    // 11. Send confirmation email
    const [userRow] = await db.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (userRow.length > 0) {
      const orderForEmail = {
        order_id: orderId,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
        subtotal,
        discount_amount: discountAmount,
        total_amount: total,
        payment_method,
        shipping_address: addrText
      };
      emailSvc.sendOrderConfirmationEmail(userRow[0].email, userRow[0].first_name, orderForEmail).catch(console.error);
    }

    res.json({ success: true, order_id: orderId, total, message: 'Order placed successfully!' });
  } catch (err) {
    await conn.rollback();
    console.error('Checkout error:', err);
    res.json({ success: false, message: 'Checkout failed. Please try again.' });
  } finally {
    conn.release();
  }
});

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.*, 
              COUNT(oi.order_item_id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.order_id
       ORDER BY o.placed_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, orders });
  } catch (err) {
    res.json({ success: false, message: 'Failed to load orders.' });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (orders.length === 0) return res.json({ success: false, message: 'Order not found.' });

    const [items] = await db.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );
    res.json({ success: true, order: { ...orders[0], items } });
  } catch (err) {
    res.json({ success: false, message: 'Failed to load order.' });
  }
});

// ── POST /api/orders/:id/cancel ───────────────────────────────────────────────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute(
      'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (orders.length === 0) { await conn.rollback(); return res.json({ success: false, message: 'Order not found.' }); }
    const order = orders[0];

    if (!['PENDING', 'TO_SHIP'].includes(order.order_status)) {
      await conn.rollback();
      return res.json({ success: false, message: 'This order cannot be cancelled anymore.' });
    }

    // Restore stock
    const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    for (const item of items) {
      await conn.execute(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
      await conn.execute(
        'INSERT INTO inventory_log (product_id, quantity_change, reason, reference_id) VALUES (?, ?, "CANCELLED", ?)',
        [item.product_id, item.quantity, String(req.params.id)]
      );
    }

    await conn.execute(
      'UPDATE orders SET order_status = "CANCELLED", payment_status = "REFUNDED" WHERE order_id = ?',
      [req.params.id]
    );
    await conn.commit();

    // Send cancellation email
    const [userRow] = await db.execute('SELECT * FROM users WHERE user_id = ?', [req.session.userId]);
    if (userRow.length > 0) {
      emailSvc.sendOrderCancellationEmail(userRow[0].email, userRow[0].first_name, order).catch(console.error);
    }

    res.json({ success: true, message: 'Order cancelled and stock restored.' });
  } catch (err) {
    await conn.rollback();
    console.error('Cancel order error:', err);
    res.json({ success: false, message: 'Cancellation failed.' });
  } finally {
    conn.release();
  }
});

// ── PUT /api/orders/:id/status (admin) ────────────────────────────────────────
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status, tracking_number } = req.body;
  const validTransitions = {
    PENDING: ['TO_SHIP', 'CANCELLED'],
    TO_SHIP: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['COMPLETED', 'CANCELLED']
  };

  try {
    const [orders] = await db.execute('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    if (orders.length === 0) return res.json({ success: false, message: 'Order not found.' });
    const order = orders[0];

    if (!validTransitions[order.order_status]?.includes(status)) {
      return res.json({ success: false, message: `Cannot transition from ${order.order_status} to ${status}.` });
    }
    if (status === 'SHIPPING' && !tracking_number) {
      return res.json({ success: false, message: 'Tracking number required.' });
    }

    await db.execute(
      'UPDATE orders SET order_status = ?, tracking_number = COALESCE(?, tracking_number) WHERE order_id = ?',
      [status, tracking_number || null, req.params.id]
    );

    // Send status update email
    const [userRow] = await db.execute('SELECT * FROM users WHERE user_id = ?', [order.user_id]);
    if (userRow.length > 0 && status !== 'CANCELLED') {
      emailSvc.sendOrderStatusEmail(userRow[0].email, userRow[0].first_name,
        { ...order, tracking_number: tracking_number || order.tracking_number }, status).catch(console.error);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Update failed.' });
  }
});

// ── GET /api/orders/admin/all (admin) ─────────────────────────────────────────
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.*, CONCAT(u.first_name, ' ', u.last_name) AS customer_name, u.email AS customer_email,
              COUNT(oi.order_item_id) AS item_count
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       GROUP BY o.order_id
       ORDER BY o.placed_at DESC`
    );
    res.json({ success: true, orders });
  } catch (err) {
    res.json({ success: false, message: 'Failed.' });
  }
});

module.exports = router;
