import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/:id  (use "me" for the logged-in user)
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params['id'] === 'me' ? req.user!.id : req.params['id'] as string;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const { passwordHash, ...user } = doc.data() as Record<string, unknown>;
    void passwordHash;
    res.json({ user: { id: doc.id, ...user } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params['id'] === 'me' ? req.user!.id : req.params['id'];
    if (id !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const { preferences, instagram, linkedin } = req.body as {
      preferences?: unknown;
      instagram?: string;
      linkedin?: string;
    };
    const updates: Record<string, unknown> = {};
    if (preferences !== undefined) updates['preferences'] = preferences;
    if (instagram !== undefined) updates['instagram'] = instagram.trim().replace(/^@/, '');
    if (linkedin !== undefined) updates['linkedin'] = linkedin.trim().replace(/^@/, '');
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'Nothing to update' });
      return;
    }
    await db.collection('users').doc(id).update(updates);
    res.json({ message: 'Profile saved' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params['id'] === 'me' ? req.user!.id : req.params['id'];
    if (id !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    // Delete user's posts first
    const posts = await db.collection('posts').where('authorId', '==', id).get();
    const batch = db.batch();
    posts.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('users').doc(id));
    await batch.commit();
    res.json({ message: 'Account deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
