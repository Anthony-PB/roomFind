import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/bookmarks — list of bookmarked posts (full data)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('bookmarks').where('userId', '==', req.user!.id).get();
    const postIds = snap.docs.map(d => (d.data() as { postId: string }).postId);
    if (postIds.length === 0) {
      res.json({ posts: [], bookmarkedIds: [] });
      return;
    }
    // Fetch posts in batches of 10 (Firestore 'in' limit)
    const posts: unknown[] = [];
    for (let i = 0; i < postIds.length; i += 10) {
      const chunk = postIds.slice(i, i + 10);
      const postsSnap = await db.collection('posts').where('__name__', 'in', chunk).get();
      postsSnap.docs.forEach(d => posts.push({ id: d.id, ...d.data() }));
    }
    res.json({ posts, bookmarkedIds: postIds });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// GET /api/bookmarks/ids — just the IDs (for browse page)
router.get('/ids', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snap = await db.collection('bookmarks').where('userId', '==', req.user!.id).get();
    const ids = snap.docs.map(d => (d.data() as { postId: string }).postId);
    res.json({ ids });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// POST /api/bookmarks/:postId
router.post('/:postId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params as { postId: string };
    const snap = await db.collection('bookmarks').where('userId', '==', req.user!.id).get();
    const existing = snap.docs.find(d => (d.data() as { postId: string }).postId === postId);
    if (existing) {
      res.status(409).json({ message: 'Already bookmarked' });
      return;
    }
    await db.collection('bookmarks').add({
      userId: req.user!.id,
      postId,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Bookmarked' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// DELETE /api/bookmarks/:postId
router.delete('/:postId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params as { postId: string };
    const snap = await db.collection('bookmarks').where('userId', '==', req.user!.id).get();
    const doc = snap.docs.find(d => (d.data() as { postId: string }).postId === postId);
    if (!doc) {
      res.status(404).json({ message: 'Bookmark not found' });
      return;
    }
    await doc.ref.delete();
    res.json({ message: 'Bookmark removed' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
