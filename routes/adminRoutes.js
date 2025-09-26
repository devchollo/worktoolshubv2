// routes/adminRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// In-memory admin store (in production, use a database)
const admins = new Map();

// Register admin (you'll call this once to set up admin accounts)
router.post('/admin/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if admin already exists
    if (admins.has(email)) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    admins.set(email, {
      email,
      password: hashedPassword,
      name,
      role: 'Administrator',
      createdAt: new Date()
    });

    res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = admins.get(email);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: `https://ui-avatars.com/api/?name=${admin.name}&background=6366f1&color=fff`
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify admin token
router.post('/admin/verify', (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = admins.get(decoded.email);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      user: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: `https://ui-avatars.com/api/?name=${admin.name}&background=6366f1&color=fff`
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;