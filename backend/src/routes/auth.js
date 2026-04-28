import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../firebase.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (!email.endsWith('.edu')) {
    return res.status(400).json({ message: 'Please use a .edu university email' });
  }
  try {
    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const ref = db.collection('users').doc();
    await ref.set({
      name,
      email,
      passwordHash,
      preferences: {},
      createdAt: new Date().toISOString(),
    });
    const token = jwt.sign(
      { id: ref.id, email, name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: ref.id, name, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const doc = snap.docs[0];
    const user = doc.data();
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: doc.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Logged in successfully',
      token,
      user: { id: doc.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

export default router;
