import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../firebase';
import { requireAuth, type AuthRequest } from '../middleware/auth';

type PostDoc = Record<string, unknown> & { id: string };

type UserPrefs = {
  noiseLevel?: number;
  cleanliness?: number;
  sleepSchedule?: string;
  pets?: string;
};

const SLEEP_IDX: Record<string, number> = { 'early-bird': 0, average: 1, 'night-owl': 2 };

function computeMatchScore(prefs: UserPrefs, post: PostDoc): number {
  const noiseDiff = Math.abs((prefs.noiseLevel ?? 3) - (post['noiseLevel'] as number ?? 3));
  const cleanDiff = Math.abs((prefs.cleanliness ?? 3) - (post['cleanLevel'] as number ?? 3));

  const noiseScore = (1 - noiseDiff / 4) * 40;
  const cleanScore = (1 - cleanDiff / 4) * 40;

  // Sleep schedule (20 pts)
  let sleepScore = 15; // neutral if not set
  const userSleep = SLEEP_IDX[prefs.sleepSchedule ?? ''];
  const postSleep = SLEEP_IDX[(post['sleepSchedule'] as string) ?? ''];
  if (userSleep !== undefined && postSleep !== undefined) {
    const diff = Math.abs(userSleep - postSleep);
    sleepScore = diff === 0 ? 20 : diff === 1 ? 10 : 0;
  }

  return Math.round(noiseScore + cleanScore + sleepScore);
}

const router = Router();

// GET /api/posts?budget=900&roomType=Double&sort=score|budget|date
router.get('/', async (req, res) => {
  try {
    // Optional auth for match score
    let userPrefs: UserPrefs | null = null;
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(
          authHeader.slice(7),
          process.env.JWT_SECRET!
        ) as { id: string };
        const userDoc = await db.collection('users').doc(decoded.id).get();
        if (userDoc.exists) {
          const data = userDoc.data() as { preferences?: UserPrefs };
          userPrefs = data.preferences ?? null;
        }
      } catch {
        // invalid token — ignore, treat as guest
      }
    }

    const { budget, roomType, sort } = req.query as {
      budget?: string;
      roomType?: string;
      sort?: string;
    };

    const snap = await db.collection('posts').orderBy('createdAt', 'desc').get();
    let posts: PostDoc[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostDoc));

    if (budget) posts = posts.filter(p => (p['budget'] as number) <= Number(budget));
    if (roomType) posts = posts.filter(p => p['roomType'] === roomType);

    // Attach match score if user has preferences
    if (userPrefs) {
      posts = posts.map(p => ({
        ...p,
        matchScore: computeMatchScore(userPrefs!, p),
      }));
    }

    // Sort
    const sortBy = sort ?? (userPrefs ? 'score' : 'date');
    if (sortBy === 'score' && userPrefs) {
      posts.sort((a, b) => ((b['matchScore'] as number) ?? 0) - ((a['matchScore'] as number) ?? 0));
    } else if (sortBy === 'budget') {
      posts.sort((a, b) => (a['budget'] as number) - (b['budget'] as number));
    }
    // 'date' keeps the default createdAt desc order

    res.json({ posts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('posts').doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json({ post: { id: doc.id, ...doc.data() } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const {
    title, location, budget, roomType, moveInDate,
    noiseLevel, cleanLevel, description,
    sleepSchedule, pets,
    lat, lng,
    isSublet, availableFrom, availableTo,
  } = req.body as Record<string, string>;

  if (!title || !location || !budget || !roomType || !moveInDate) {
    res.status(400).json({ message: 'title, location, budget, roomType, and moveInDate are required' });
    return;
  }

  try {
    const ref = db.collection('posts').doc();
    const post: Record<string, unknown> = {
      authorId: req.user!.id,
      authorName: req.user!.name,
      title,
      location,
      budget: Number(budget),
      roomType,
      moveInDate,
      noiseLevel: Number(noiseLevel) || 3,
      cleanLevel: Number(cleanLevel) || 3,
      description: description || '',
      sleepSchedule: sleepSchedule || '',
      pets: pets || '',
      isSublet: isSublet === 'true' || isSublet === true as unknown,
      availableFrom: availableFrom || '',
      availableTo: availableTo || '',
      createdAt: new Date().toISOString(),
    };
    if (lat && lng) {
      post['lat'] = Number(lat);
      post['lng'] = Number(lng);
    }
    await ref.set(post);
    res.status(201).json({ post: { id: ref.id, ...post } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id as string;
    const ref = db.collection('posts').doc(postId);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    const data = doc.data() as PostDoc;
    if (data['authorId'] !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const allowed = [
      'title', 'location', 'budget', 'roomType', 'moveInDate',
      'noiseLevel', 'cleanLevel', 'description',
      'sleepSchedule', 'pets', 'lat', 'lng',
      'isSublet', 'availableFrom', 'availableTo',
    ];
    const numFields = new Set(['budget', 'noiseLevel', 'cleanLevel', 'lat', 'lng']);
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if ((req.body as Record<string, unknown>)[field] !== undefined) {
        updates[field] = numFields.has(field)
          ? Number((req.body as Record<string, unknown>)[field])
          : (req.body as Record<string, unknown>)[field];
      }
    }

    await ref.update(updates);
    const { id: _id, ...dataWithoutId } = data;
    void _id;
    res.json({ message: 'Post updated', post: { id: postId, ...dataWithoutId, ...updates } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.id as string);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    const data = doc.data() as PostDoc;
    if (data['authorId'] !== req.user!.id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    await ref.delete();
    res.json({ message: 'Post deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: `Server error: ${msg}` });
  }
});

export default router;
