import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

type MsgData = {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  text: string;
  createdAt: string;
};

// GET /api/messages — list of conversations (most recent message per contact)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('messages').where('fromUserId', '==', req.user!.id).get(),
      db.collection('messages').where('toUserId', '==', req.user!.id).get(),
    ]);

    const convMap = new Map<string, {
      userId: string;
      userName: string;
      lastMessage: string;
      lastAt: string;
    }>();

    for (const doc of [...sentSnap.docs, ...receivedSnap.docs]) {
      const d = doc.data() as MsgData;
      const otherId = d.fromUserId === req.user!.id ? d.toUserId : d.fromUserId;
      const otherName = d.fromUserId === req.user!.id ? d.toUserName : d.fromUserName;
      const existing = convMap.get(otherId);
      if (!existing || d.createdAt > existing.lastAt) {
        convMap.set(otherId, {
          userId: otherId,
          userName: otherName,
          lastMessage: d.text,
          lastAt: d.createdAt,
        });
      }
    }

    const conversations = Array.from(convMap.values()).sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt)
    );
    res.json({ conversations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// GET /api/messages/:userId — full conversation thread
router.get('/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const otherId = req.params['userId'] as string;
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('messages')
        .where('fromUserId', '==', req.user!.id)
        .where('toUserId', '==', otherId)
        .get(),
      db.collection('messages')
        .where('fromUserId', '==', otherId)
        .where('toUserId', '==', req.user!.id)
        .get(),
    ]);

    const messages = [
      ...sentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>)),
      ...receivedSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>)),
    ].sort((a, b) =>
      String(a['createdAt']).localeCompare(String(b['createdAt']))
    );

    // Fetch other user's name
    const otherDoc = await db.collection('users').doc(otherId).get();
    const otherName = otherDoc.exists ? (otherDoc.data() as { name: string }).name : 'Unknown';

    res.json({ messages, otherName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// POST /api/messages/:userId — send a message
router.post('/:userId', requireAuth, async (req: AuthRequest, res) => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) {
    res.status(400).json({ message: 'text is required' });
    return;
  }
  try {
    const otherId = req.params['userId'] as string;
    const otherDoc = await db.collection('users').doc(otherId).get();
    if (!otherDoc.exists) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const otherName = (otherDoc.data() as { name: string }).name;
    await db.collection('messages').add({
      fromUserId: req.user!.id,
      fromUserName: req.user!.name,
      toUserId: otherId,
      toUserName: otherName,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Sent' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
