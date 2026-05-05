import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/requests — send a roommate request
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { toUserId, postId, message } = req.body as {
    toUserId: string;
    postId: string;
    message?: string;
  };
  if (!toUserId || !postId) {
    res.status(400).json({ message: 'toUserId and postId are required' });
    return;
  }
  if (toUserId === req.user!.id) {
    res.status(400).json({ message: 'Cannot send a request to yourself' });
    return;
  }
  try {
    // Check for duplicate
    const snap = await db.collection('requests').where('fromUserId', '==', req.user!.id).get();
    const dupe = snap.docs.find(d => {
      const data = d.data() as { postId: string };
      return data.postId === postId;
    });
    if (dupe) {
      res.status(409).json({ message: 'You already sent a request for this listing' });
      return;
    }

    const [toUserDoc, postDoc] = await Promise.all([
      db.collection('users').doc(toUserId).get(),
      db.collection('posts').doc(postId).get(),
    ]);
    const toUserName = toUserDoc.exists ? (toUserDoc.data() as { name: string }).name : 'Unknown';
    const postTitle = postDoc.exists ? (postDoc.data() as { title: string }).title : 'Listing';

    await db.collection('requests').add({
      fromUserId: req.user!.id,
      fromUserName: req.user!.name,
      toUserId,
      toUserName,
      postId,
      postTitle,
      message: message?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Request sent' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// GET /api/requests — sent + received requests
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('requests').where('fromUserId', '==', req.user!.id).get(),
      db.collection('requests').where('toUserId', '==', req.user!.id).get(),
    ]);
    const sort = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
      docs
        .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
        .sort((a, b) => String(b['createdAt']).localeCompare(String(a['createdAt'])));
    res.json({ sent: sort(sentSnap.docs), received: sort(receivedSnap.docs) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// PATCH /api/requests/:id — accept or decline
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.body as { status: string };
  if (!['accepted', 'declined'].includes(status)) {
    res.status(400).json({ message: 'status must be accepted or declined' });
    return;
  }
  try {
    const ref = db.collection('requests').doc(req.params['id'] as string);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }
    if ((doc.data() as { toUserId: string }).toUserId !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    await ref.update({ status });
    res.json({ message: `Request ${status}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
