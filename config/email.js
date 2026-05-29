const brevoSDK = require('@getbrevo/brevo');
require('dotenv').config();

// ── Brevo API setup ───────────────────────────────────────
const defaultClient = brevoSDK.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new brevoSDK.TransactionalEmailsApi();

// ── Safe send ─────────────────────────────────────────────
async function sendEmail(to, subject, htmlContent) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`📧 [SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return { simulated: true };
  }
  try {
    const sendSmtpEmail = new brevoSDK.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: 'Qdreon Shop', email: process.env.BREVO_FROM || 'noreply@qdreon.com' };
    sendSmtpEmail.to = [{ email: to }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`📧 Email sent to ${to}: ${data.messageId}`);
    return data;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return null;
  }
}

// ── HTML email wrapper ────────────────────────────────────
function emailWrapper(title, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Helvetica Neue',Arial,sans-serif; background:#f4f6f9; color:#1a1a2e; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); padding:32px 40px; text-align:center; }
    .header .logo { font-size:28px; font-weight:800; color:#e8c97e; letter-spacing:2px; }
    .header .tagline { color:rgba(255,255,255,0.6); font-size:12px; margin-top:4px; }
    .body { padding:40px; }
    .title { font-size:22px; font-weight:700; color:#1a1a2e; margin-bottom:16px; }
    .text { font-size:15px; line-height:1.7; color:#4a5568; margin-bottom:16px; }
    .code-box { background:#f7f4ed; border:2px dashed #e8c97e; border-radius:12px; text-align:center; padding:24px; margin:24px 0; }
    .code { font-size:40px; font-weight:900; letter-spacing:10px; color:#1a1a2e; }
    .code-label { font-size:12px; color:#718096; margin-top:8px; text-transform:uppercase; }
    .btn { display:inline-block; background:#e8c97e; color:#1a1a2e; font-weight:700; padding:14px 32px; border-radius:8px; text-decoration:none; font-size:15px; margin:16px 0; }
    .order-table { width:100%; border-collapse:collapse; margin:20px 0; }
    .order-table th { background:#f7f4ed; padding:12px 16px; text-align:left; font-size:12px; text-transform:uppercase; color:#718096; border-bottom:2px solid #e8c97e; }
    .order-table td { padding:12px 16px; border-bottom:1px solid #edf2f7; font-size:14px; }
    .total-row td { font-weight:700; font-size:16px; border-top:2px solid #1a1a2e; }
    .footer { background:#f7f4ed; padding:24px 40px; text-align:center; }
    .footer p { font-size:12px; color:#a0aec0; line-height:1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">QDREON</div>
      <div class="tagline">Online Shopping System</div>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      <p>&copy; 2026 Qdreon · Synexis Group · CpE 2201 · USC</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email templates ───────────────────────────────────────

async function sendVerificationEmail(to, firstName, code) {
  const html = emailWrapper('Verify Your Account', `
    <p class="title">Welcome to Qdreon, ${firstName}! 👋</p>
    <p class="text">Thanks for signing up. Use the code below to verify your email address.</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="code-label">Expires in 15 minutes</div>
    </div>
    <p class="text">If you didn't create an account, ignore this email.</p>
  `);
  return sendEmail(to, 'Verify your Qdreon account', html);
}

async function sendWelcomeEmail(to, firstName) {
  const html = emailWrapper('Welcome to Qdreon!', `
    <p class="title">You're all set, ${firstName}! 🎉</p>
    <p class="text">Your account is verified. Use code <strong>WELCOME50</strong> for ₱50 off your first order.</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn">Start Shopping →</a>
  `);
  return sendEmail(to, "Welcome to Qdreon — you're verified!", html);
}

async function sendPasswordResetEmail(to, firstName, code) {
  const html = emailWrapper('Reset Your Password', `
    <p class="title">Password Reset Request</p>
    <p class="text">Hi ${firstName}, use the code below to reset your password.</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="code-label">Expires in 15 minutes</div>
    </div>
    <p class="text">If you didn't request this, ignore this email.</p>
  `);
  return sendEmail(to, 'Reset your Qdreon password', html);
}

async function sendOrderConfirmationEmail(to, firstName, order) {
  const itemRows = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₱${parseFloat(item.unit_price).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
      <td style="text-align:right">₱${(item.unit_price*item.quantity).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
    </tr>`).join('');

  const html = emailWrapper('Order Confirmed!', `
    <p class="title">Order Confirmed! 🛍️</p>
    <p class="text">Hi ${firstName}, your order <strong>#${order.order_id}</strong> has been placed.</p>
    <table class="order-table">
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${itemRows}
        ${order.discount_amount > 0 ? `<tr><td colspan="3" style="text-align:right;color:#16a34a;font-weight:600">Discount</td><td style="text-align:right;color:#16a34a;font-weight:600">-₱${parseFloat(order.discount_amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</td></tr>` : ''}
        <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">₱${parseFloat(order.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</td></tr>
      </tbody>
    </table>
    <p class="text"><strong>Shipping to:</strong><br>${order.shipping_address}</p>
    <p class="text"><strong>Payment:</strong> ${order.payment_method}</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" class="btn">Track Your Order →</a>
  `);
  return sendEmail(to, `Order Confirmed — #${order.order_id}`, html);
}

async function sendOrderCancellationEmail(to, firstName, order) {
  const html = emailWrapper('Order Cancelled', `
    <p class="title">Order Cancelled</p>
    <p class="text">Hi ${firstName}, your order <strong>#${order.order_id}</strong> has been cancelled.</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/products" class="btn">Browse Products →</a>
  `);
  return sendEmail(to, `Order #${order.order_id} Cancelled`, html);
}

async function sendOrderStatusEmail(to, firstName, order, newStatus) {
  const msgs = {
    TO_SHIP:   { emoji:'📦', text:'Your order is being packed.' },
    SHIPPING:  { emoji:'🚚', text:`On the way! Tracking: <strong>${order.tracking_number||'N/A'}</strong>` },
    COMPLETED: { emoji:'✅', text:'Your order has been delivered. Thank you!' }
  };
  const msg = msgs[newStatus] || { emoji:'📋', text:'Your order status has been updated.' };
  const html = emailWrapper('Order Update', `
    <p class="title">${msg.emoji} Order Update</p>
    <p class="text">Hi ${firstName}, order <strong>#${order.order_id}</strong> is now <strong>${newStatus.replace('_',' ')}</strong>.</p>
    <p class="text">${msg.text}</p>
    <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" class="btn">View Order →</a>
  `);
  return sendEmail(to, `Order #${order.order_id} — Status Update`, html);
}

module.exports = {
  sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail,
  sendOrderConfirmationEmail, sendOrderCancellationEmail, sendOrderStatusEmail
};
