const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const email = require('../config/email');

// Generate 6-digit OTP
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { first_name, last_name, email: userEmail, phone, password } = req.body;
  if (!first_name || !last_name || !userEmail || !password) {
    return res.json({ success: false, message: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  try {
    // Check duplicate email
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [userEmail.toLowerCase()]);
    if (existing.length > 0) {
      return res.json({ success: false, message: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)',
      [userEmail.toLowerCase(), hash, first_name.trim(), last_name.trim(), phone || null]
    );
    const userId = result.insertId;

    // Create cart for new user
    await db.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);

    // Send verification code
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await db.execute(
      'INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, "VERIFY", ?)',
      [userId, code, expires]
    );

    await email.sendVerificationEmail(userEmail, first_name, code);

    res.json({ success: true, message: 'Account created! Check your email for a verification code.', userId });
  } catch (err) {
    console.error('Register error:', err);
    res.json({ success: false, message: 'Registration failed. Try again.' });
  }
});

// ── POST /api/auth/verify ─────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { userId, code } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM verification_codes WHERE user_id = ? AND code = ? AND type = "VERIFY" AND used = 0 AND expires_at > NOW()',
      [userId, code]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid or expired code.' });
    }
    await db.execute('UPDATE users SET is_verified = 1 WHERE user_id = ?', [userId]);
    await db.execute('UPDATE verification_codes SET used = 1 WHERE code_id = ?', [rows[0].code_id]);

    // Get user info to send welcome email
    const [users] = await db.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (users.length > 0) {
      await email.sendWelcomeEmail(users[0].email, users[0].first_name);
    }

    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.json({ success: false, message: 'Verification failed.' });
  }
});

// ── POST /api/auth/resend-code ────────────────────────────────────────────────
router.post('/resend-code', async (req, res) => {
  const { userId } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE user_id = ? AND is_verified = 0', [userId]);
    if (users.length === 0) return res.json({ success: false, message: 'User not found or already verified.' });

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.execute(
      'INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, "VERIFY", ?)',
      [userId, code, expires]
    );
    await email.sendVerificationEmail(users[0].email, users[0].first_name, code);
    res.json({ success: true, message: 'New code sent to your email.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to resend code.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email: userEmail, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [userEmail.toLowerCase()]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.is_verified) {
      // Re-send verification code
      const code = generateCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      await db.execute(
        'INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, "VERIFY", ?)',
        [user.user_id, code, expires]
      );
      await email.sendVerificationEmail(user.email, user.first_name, code);
      return res.json({ success: false, needsVerification: true, userId: user.user_id, message: 'Please verify your email first. A new code has been sent.' });
    }

    // Set session
    req.session.userId    = user.user_id;
    req.session.email     = user.email;
    req.session.firstName = user.first_name;
    req.session.lastName  = user.last_name;
    req.session.role      = user.role;

    res.json({ success: true, role: user.role, redirect: user.role === 'ADMIN' ? '/admin' : '/' });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: 'Login failed. Try again.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email: userEmail } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [userEmail.toLowerCase()]
    );
    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset code has been sent.' });
    }
    const user = rows[0];
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.execute(
      'INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, "RESET", ?)',
      [user.user_id, code, expires]
    );
    await email.sendPasswordResetEmail(user.email, user.first_name, code);
    res.json({ success: true, userId: user.user_id, message: 'Reset code sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json({ success: false, message: 'Failed. Try again.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { userId, code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  try {
    const [rows] = await db.execute(
      'SELECT * FROM verification_codes WHERE user_id = ? AND code = ? AND type = "RESET" AND used = 0 AND expires_at > NOW()',
      [userId, code]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid or expired reset code.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
    await db.execute('UPDATE verification_codes SET used = 1 WHERE code_id = ?', [rows[0].code_id]);
    res.json({ success: true, message: 'Password updated! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.json({ success: false, message: 'Reset failed.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    userId:    req.session.userId,
    firstName: req.session.firstName,
    lastName:  req.session.lastName,
    email:     req.session.email,
    role:      req.session.role
  });
});

module.exports = router;
