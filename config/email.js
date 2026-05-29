const nodemailer = require('nodemailer');
require('dotenv').config();

// ── Transporter (Gmail SMTP) ──────────────────────────────────────────────────
// Uses Gmail App Password - works without paying for SMTP service
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// ── Verify connection on startup ──────────────────────────────────────────────
transporter.verify((error) => {
  if (error) {
    console.log('⚠️  Email service not configured:', error.message);
    console.log('   Set GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable emails.');
  } else {
    console.log('✅ Email service ready via Gmail SMTP');
  }
});

// ── HTML email wrapper ────────────────────────────────────────────────────────
function emailWrapper(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; color: #1a1a2e; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; }
    .header .logo { font-size: 28px; font-weight: 800; color: #e8c97e; letter-spacing: 2px; }
    .header .tagline { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px; letter-spacing: 1px; }
    .body { padding: 40px; }
    .title { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }
    .text { font-size: 15px; line-height: 1.7; color: #4a5568; margin-bottom: 16px; }
    .code-box { background: #f7f4ed; border: 2px dashed #e8c97e; border-radius: 12px; text-align: center; padding: 24px; margin: 24px 0; }
    .code { font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #1a1a2e; }
    .code-label { font-size: 12px; color: #718096; margin-top: 8px; letter-spacing: 1px; text-transform: uppercase; }
    .btn { display: inline-block; background: #e8c97e; color: #1a1a2e; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; margin: 16px 0; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th { background: #f7f4ed; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #718096; border-bottom: 2px solid #e8c97e; }
    .order-table td { padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .total-row td { font-weight: 700; font-size: 16px; color: #1a1a2e; border-top: 2px solid #1a1a2e; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-confirmed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .divider { border: none; border-top: 1px solid #edf2f7; margin: 24px 0; }
    .footer { background: #f7f4ed; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #a0aec0; line-height: 1.6; }
    .footer a { color: #e8c97e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">QDREON</div>
      <div class="tagline">Online Shopping System</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>This email was sent by Qdreon Online Shopping System.<br>
      &copy; 2026 Qdreon · Synexis Group · CpE 2201 · USC<br>
      <a href="#">Unsubscribe</a> · <a href="#">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Safe send (won't crash app if email isn't configured) ─────────────────────
async function sendEmail(to, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`📧 [SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return { simulated: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"Qdreon Shop" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Email templates
// ══════════════════════════════════════════════════════════════════════════════

// 1. Account verification code
async function sendVerificationEmail(to, firstName, code) {
  const html = emailWrapper('Verify Your Account', `
    <p class="title">Welcome to Qdreon, ${firstName}! 👋</p>
    <p class="text">Thanks for signing up. Please use the verification code below to confirm your email address.</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="code-label">Your verification code · expires in 15 minutes</div>
    </div>
    <p class="text">If you didn't create an account with us, you can safely ignore this email.</p>
  `);
  return sendEmail(to, 'Verify your Qdreon account', html);
}

// 2. Welcome email (after verification)
async function sendWelcomeEmail(to, firstName) {
  const html = emailWrapper('Welcome to Qdreon!', `
    <p class="title">You're all set, ${firstName}! 🎉</p>
    <p class="text">Your account has been verified. You can now shop, track orders, and enjoy exclusive deals on Qdreon.</p>
    <p class="text">Use code <strong>WELCOME50</strong> on your first order for ₱50 off (min ₱300 purchase).</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn">Start Shopping →</a>
  `);
  return sendEmail(to, 'Welcome to Qdreon — you\'re verified!', html);
}

// 3. Password reset code
async function sendPasswordResetEmail(to, firstName, code) {
  const html = emailWrapper('Reset Your Password', `
    <p class="title">Password Reset Request</p>
    <p class="text">Hi ${firstName}, we received a request to reset your password. Use the code below:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="code-label">Reset code · expires in 15 minutes</div>
    </div>
    <p class="text">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  `);
  return sendEmail(to, 'Reset your Qdreon password', html);
}

// 4. Order confirmation
async function sendOrderConfirmationEmail(to, firstName, order) {
  const itemRows = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₱${parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right">₱${(item.unit_price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = emailWrapper('Order Confirmed!', `
    <p class="title">Order Confirmed! 🛍️</p>
    <p class="text">Hi ${firstName}, your order <strong>#${order.order_id}</strong> has been placed successfully and is now being processed.</p>
    
    <table class="order-table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${order.discount_amount > 0 ? `
        <tr>
          <td colspan="3" style="text-align:right; color:#16a34a; font-weight:600;">Discount Applied</td>
          <td style="text-align:right; color:#16a34a; font-weight:600;">-₱${parseFloat(order.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td colspan="3" style="text-align:right">Total</td>
          <td style="text-align:right">₱${parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <p class="text"><strong>Shipping to:</strong><br>${order.shipping_address}</p>
    <p class="text"><strong>Payment method:</strong> ${order.payment_method}</p>
    <p class="text">You can track your order status in your account's Orders section.</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" class="btn">Track Your Order →</a>
  `);
  return sendEmail(to, `Order Confirmed — #${order.order_id}`, html);
}

// 5. Order cancellation / refund
async function sendOrderCancellationEmail(to, firstName, order) {
  const html = emailWrapper('Order Cancelled', `
    <p class="title">Order Cancelled</p>
    <p class="text">Hi ${firstName}, your order <strong>#${order.order_id}</strong> has been cancelled as requested.</p>
    <p class="text">
      <span class="status-badge status-cancelled">Cancelled</span>
    </p>
    <p class="text">Since this is a simulated store, no real payment was involved. If you had a real transaction, a refund of <strong>₱${parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> would be processed within 3–5 business days.</p>
    <p class="text">Changed your mind? Items are available to order again.</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/products" class="btn">Browse Products →</a>
  `);
  return sendEmail(to, `Order #${order.order_id} Cancelled`, html);
}

// 6. Order status update
async function sendOrderStatusEmail(to, firstName, order, newStatus) {
  const statusMessages = {
    TO_SHIP:   { emoji: '📦', text: 'Your order is being packed and will be shipped soon.' },
    SHIPPING:  { emoji: '🚚', text: `Your order is on the way! Tracking number: <strong>${order.tracking_number || 'N/A'}</strong>` },
    COMPLETED: { emoji: '✅', text: 'Your order has been delivered. Thank you for shopping with us!' }
  };
  const msg = statusMessages[newStatus] || { emoji: '📋', text: 'Your order status has been updated.' };
  
  const html = emailWrapper('Order Update', `
    <p class="title">${msg.emoji} Order Update</p>
    <p class="text">Hi ${firstName}, your order <strong>#${order.order_id}</strong> has been updated.</p>
    <p class="text">New status: <span class="status-badge status-confirmed">${newStatus.replace('_', ' ')}</span></p>
    <p class="text">${msg.text}</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" class="btn">View Order →</a>
  `);
  return sendEmail(to, `Order #${order.order_id} — Status Update`, html);
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendOrderStatusEmail
};
