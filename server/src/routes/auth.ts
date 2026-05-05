import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../firebase';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email, and password are required' });
    return;
  }
  if (!email.endsWith('.edu')) {
    res.status(400).json({ message: 'Please use a .edu university email' });
    return;
  }

  try {
    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      res.status(409).json({ message: 'An account with this email already exists' });
      return;
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
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: ref.id, name, email },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Register error:', err);
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const doc = snap.docs[0];
    const user = doc.data();
    const valid = await bcrypt.compare(password, user['passwordHash']);
    if (!valid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: doc.id, email: user['email'], name: user['name'] },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Logged in successfully',
      token,
      user: { id: doc.id, name: user['name'], email: user['email'] },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Login error:', err);
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
