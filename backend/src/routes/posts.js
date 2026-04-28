import { Router } from 'express';
import { db } from '../firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/posts?budget=900&roomType=Double
router.get('/', async (req, res) => {
  try {
    const { budget, roomType } = req.query;
    const snap = await db.collection('posts').orderBy('createdAt', 'desc').get();
    let posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (budget) posts = posts.filter(p => p.budget <= Number(budget));
    if (roomType) posts = posts.filter(p => p.roomType === roomType);

    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res) => {
  const { title, location, budget, roomType, moveInDate, noiseLevel, cleanLevel, description } = req.body;
  if (!title || !location || !budget || !roomType || !moveInDate) {
    return res.status(400).json({ message: 'title, location, budget, roomType, and moveInDate are required' });
  }
  try {
    const ref = db.collection('posts').doc();
    const post = {
      authorId: req.user.id,
      authorName: req.user.name,
      title,
      location,
      budget: Number(budget),
      roomType,
      moveInDate,
      noiseLevel: Number(noiseLevel) || 3,
      cleanLevel: Number(cleanLevel) || 3,
      description: description || '',
      createdAt: new Date().toISOString(),
    };
    await ref.set(post);
    res.status(201).json({ post: { id: ref.id, ...post } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: 'Post not found' });
    if (doc.data().authorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    const allowed = ['title', 'location', 'budget', 'roomType', 'moveInDate', 'noiseLevel', 'cleanLevel', 'description'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = ['budget', 'noiseLevel', 'cleanLevel'].includes(field)
          ? Number(req.body[field])
          : req.body[field];
      }
    }
    await ref.update(updates);
    res.json({ message: 'Post updated', post: { id: req.params.id, ...doc.data(), ...updates } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: 'Post not found' });
    if (doc.data().authorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    await ref.delete();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
