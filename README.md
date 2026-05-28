# 🛍️ Qdreon Online Shopping System

> CpE 2201 · Synexis Group · USC 2026

---

## 📋 What's in this project

| Folder/File | What it does |
|---|---|
| `server.js` | Main Express server entry point |
| `routes/auth.js` | Register, login, verify, forgot/reset password |
| `routes/products.js` | Browse, filter, CRUD products |
| `routes/cart.js` | Add/update/remove cart items |
| `routes/orders.js` | Checkout, order history, cancel, admin status updates |
| `routes/user.js` | Profile, password, addresses |
| `routes/admin.js` | Dashboard stats, user management |
| `config/database.js` | MySQL connection pool |
| `config/email.js` | Nodemailer + Gmail SMTP email service |
| `middleware/auth.js` | `requireAuth` and `requireAdmin` guards |
| `scripts/hash-passwords.js` | One-time script to set bcrypt passwords after seeding |
| `public/index.html` | Single-page app frontend |
| `public/app.js` | All frontend JavaScript (SPA) |
| `public/style.css` | Styling |
| `01_schema.sql` | Database schema (run first) |
| `02_seed.sql` | Sample data (run second) |

---



You should see the Qdreon homepage! 🎉

---

## 📧 Email Features

The app sends emails automatically for:

| Trigger | Email sent |
|---|---|
| Register | 6-digit verification code |
| Email verified | Welcome email with promo code |
| Forgot password | 6-digit reset code |
| Checkout | Order confirmation with item list |
| Order cancelled | Cancellation confirmation |
| Admin updates order status | Shipping/delivery notification |

All emails are HTML-formatted with the Qdreon branding.

---

## 🛒 How the Checkout Works

1. User adds items to cart
2. Goes to Cart → clicks "Proceed to Checkout"
3. Checkout page auto-loads their saved default address
4. If no address saved → prompted to add one in Profile first
5. User can add a promo code (see codes below)
6. Selects payment method (COD, GCash, or Card — all simulated)
7. Clicks "Place Order" → order confirmed, email sent
8. Tracking is shown in **My Orders** (the clipboard icon in navbar)

**Promo codes that work:**
- `WELCOME50` — ₱50 off orders ≥ ₱300
- `SYNEXIS10` — 10% off orders ≥ ₱500
- `USC2026` — 15% off orders ≥ ₱1,000
- `SAVE100` — ₱100 off orders ≥ ₱2,000
- `FLASH20` — 20% off orders ≥ ₱500

---


## 🐛 Common Issues & Fixes

**"Error: Access denied for user 'root'@'localhost'"**
→ Check your `DB_PASSWORD` in `.env`

**"Cannot find module '../config/database'"**
→ Make sure you're running `node server.js` from the `/qdreon` folder, not a subfolder

**Emails not sending**
→ Check that 2FA is enabled on Gmail and the App Password is correct (no spaces)
→ The app still works without email — codes are printed to the console

**Cart issues after checkout**
→ This is fixed in the updated `01_schema.sql` (removed UNIQUE constraint on `user_id` in carts table)

**"Port 3000 already in use"**
→ Change `PORT=3001` in your `.env`, or kill the process using the port

---

## 📁 Project File Structure

```
qdreon/
├── server.js              ← Start here
├── package.json
├── .env                   ← Your secrets (never commit this!)
├── .env.example           ← Template
├── .gitignore
├── 01_schema.sql          ← Run first in MySQL
├── 02_seed.sql            ← Run second in MySQL
├── config/
│   ├── database.js        ← MySQL pool connection
│   └── email.js           ← Nodemailer + all email templates
├── routes/
│   ├── auth.js            ← /api/auth/*
│   ├── products.js        ← /api/products/*
│   ├── cart.js            ← /api/cart/*
│   ├── orders.js          ← /api/orders/*
│   ├── user.js            ← /api/user/*
│   └── admin.js           ← /api/admin/*
├── middleware/
│   └── auth.js            ← requireAuth, requireAdmin
├── scripts/
│   └── hash-passwords.js  ← Run once after seeding
└── public/
    ├── index.html         ← The entire frontend SPA
    ├── app.js             ← All frontend logic
    └── style.css          ← Styles
```
