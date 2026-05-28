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



**Promo codes that work:**
- `WELCOME50` — ₱50 off orders ≥ ₱300
- `SYNEXIS10` — 10% off orders ≥ ₱500
- `USC2026` — 15% off orders ≥ ₱1,000
- `SAVE100` — ₱100 off orders ≥ ₱2,000
- `FLASH20` — 20% off orders ≥ ₱500


