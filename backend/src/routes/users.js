import { Router } from 'express';
import { db } from '../firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/users/:id  (use "me" for the logged-in user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id === 'me' ? req.user.id : req.params.id;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ message: 'User not found' });
    const { passwordHash, ...user } = doc.data();
    res.json({ user: { id: doc.id, ...user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id === 'me' ? req.user.id : req.params.id;
    if (id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    const { preferences } = req.body;
    if (!preferences) return res.status(400).json({ message: 'preferences field is required' });
    await db.collection('users').doc(id).update({ preferences });
    res.json({ message: 'Preferences saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
