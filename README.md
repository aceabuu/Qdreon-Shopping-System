# 🛍️ Qdreon Online Shopping System
**Node.js + Express + MySQL — Setup & Deployment Guide**

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

## 🖥️ Part 1 — Local Setup

### Step 1 — Install Prerequisites

You need:
- **Node.js 18+** → https://nodejs.org (download LTS)
- **MySQL 8.0+** → https://dev.mysql.com/downloads/mysql/
- **Git** → https://git-scm.com (for deployment later)

Verify installations by opening a terminal (Command Prompt / PowerShell on Windows, Terminal on Mac) and running:
```
node -v
npm -v
mysql --version
git --version
```

---

### Step 2 — Set up the MySQL Database

1. Open MySQL Workbench **or** a terminal and log in:
   ```
   mysql -u root -p
   ```
   (type your MySQL root password when prompted)

2. Run the schema file:
   ```sql
   SOURCE C:/path/to/qdreon/01_schema.sql;
   ```
   *(Replace the path with where you put the project. On Mac/Linux use forward slashes.)*

3. Run the seed file (sample data):
   ```sql
   SOURCE C:/path/to/qdreon/02_seed.sql;
   ```

4. Verify it worked:
   ```sql
   USE qdreon_db;
   SHOW TABLES;
   SELECT email, first_name, role FROM users;
   ```
   You should see 6 users.

5. Exit MySQL:
   ```sql
   EXIT;
   ```

---

### Step 3 — Install Node.js dependencies

Open a terminal, navigate into the project folder:
```
cd path/to/qdreon
npm install
```
This installs everything listed in `package.json` (express, bcryptjs, nodemailer, mysql2, etc.).

---

### Step 4 — Configure environment variables

1. Copy the template:
   ```
   cp .env.example .env
   ```
   On Windows:
   ```
   copy .env.example .env
   ```

2. Open `.env` in any text editor (Notepad, VS Code) and fill in:
   - `DB_PASSWORD` — your MySQL password (leave blank if no password)
   - `SESSION_SECRET` — type any random string, e.g. `qdreon_super_secret_2026`
   - Gmail fields — see Step 5 below

---

### Step 5 — Set up Gmail SMTP (for emails)

> This lets the app send real verification codes, order confirmations, etc. for free using your Gmail.

1. Go to your Google Account → **Security**
2. Make sure **2-Step Verification** is turned ON
3. Search for **"App Passwords"** in the search bar
4. Select **Mail** and your device → click **Generate**
5. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)
6. In your `.env` file:
   ```
   GMAIL_USER=youremail@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```
   (paste without spaces)

> **If you skip this step**, the app still works — emails are just logged to the console instead of being sent. You'll see messages like `📧 [SIMULATED EMAIL] To: ...` in the terminal.

---

### Step 6 — Hash the seed passwords

The seed data uses a placeholder password hash. Run this one-time script to set real bcrypt passwords:
```
node scripts/hash-passwords.js
```

After this, the test accounts work with these credentials:

| Email | Password | Role |
|---|---|---|
| admin@qdreon.com | admin123 | Admin |
| 24105121@usc.edu.ph | lance123 | Customer |
| 24100644@usc.edu.ph | zhen123 | Customer |
| 24103744@usc.edu.ph | sancho123 | Customer |
| 22101315@usc.edu.ph | andre123 | Customer |
| 23104688@usc.edu.ph | kyle123 | Customer |

---

### Step 7 — Start the server

```
npm start
```

Or with auto-restart on file changes (development):
```
npm run dev
```

Open your browser and go to: **http://localhost:3000**

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

## 🚀 Part 2 — Deploying to Render (Free Hosting)

### What you need
- A free **Render** account → https://render.com
- A free **PlanetScale** or **Railway** MySQL database (Render doesn't include MySQL)
- Your code pushed to **GitHub**

---

### Step 1 — Push to GitHub

1. Create a GitHub account if you don't have one: https://github.com
2. Create a new repository (click **+** → New repository → name it `qdreon` → Create)
3. In your project folder, open a terminal:
   ```
   git init
   git add .
   git commit -m "Initial Qdreon project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/qdreon.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

---

### Step 2 — Get a free MySQL database on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Provision MySQL**
3. Once created, click on the MySQL service → **Connect** tab
4. Copy the connection details:
   - Host (e.g. `containers-us-west-xxx.railway.app`)
   - Port (e.g. `6538`)
   - Database name
   - Username
   - Password

5. Run your SQL files on the Railway database:
   - Use **MySQL Workbench**: add a new connection with the Railway details
   - Then run `01_schema.sql` and `02_seed.sql` as before
   - Then run `node scripts/hash-passwords.js` with the Railway DB details in your `.env`

---

### Step 3 — Deploy to Render

1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub repo (`qdreon`)
3. Fill in settings:
   - **Name**: `qdreon` (or whatever you want)
   - **Region**: Singapore (closest to Philippines)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

4. Click **Advanced** → **Add Environment Variables** and add all of these:
   ```
   NODE_ENV         = production
   PORT             = 3000
   SESSION_SECRET   = (any random string)
   DB_HOST          = (your Railway MySQL host)
   DB_PORT          = (your Railway MySQL port)
   DB_NAME          = (your Railway database name)
   DB_USER          = (your Railway username)
   DB_PASSWORD      = (your Railway password)
   GMAIL_USER       = (your Gmail)
   GMAIL_APP_PASSWORD = (your App Password)
   APP_URL          = https://your-app-name.onrender.com
   ```

5. Click **Create Web Service**
6. Wait 2-3 minutes for it to build and deploy
7. Your site will be live at `https://your-app-name.onrender.com` 🎉

---

### ⚠️ Render Free Tier Notes
- The free tier **spins down** after 15 minutes of inactivity
- First visit after inactivity takes ~30 seconds to wake up
- Upgrade to a paid plan ($7/month) if you need it always-on

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
