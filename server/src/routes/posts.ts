import { Router } from 'express';
const router = Router();

const STUB_POSTS = [
  {
    id: '1',
    authorId: 'u1',
    authorName: 'Alice Chen',
    location: 'Collegetown',
    budget: 800,
    moveInDate: '2025-08-01',
    roomType: 'double',
    noiseLevel: 2,
    cleanlinessLevel: 4,
    description: 'Looking for a quiet roommate near campus.',
    createdAt: new Date().toISOString(),
    matchScore: 85,
  },
  {
    id: '2',
    authorId: 'u2',
    authorName: 'Bob Kim',
    location: 'West Campus',
    budget: 700,
    moveInDate: '2025-08-15',
    roomType: 'single',
    noiseLevel: 4,
    cleanlinessLevel: 3,
    description: 'Social and easy-going, have a cat.',
    createdAt: new Date().toISOString(),
    matchScore: 62,
  },
];

// GET /api/posts
router.get('/', (req, res) => {
  const sorted = [...STUB_POSTS].sort(
    (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)
  );
  res.status(200).json(sorted);
});

// GET /api/posts/:id
router.get('/:id', (req, res) => {
  const post = STUB_POSTS.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.status(200).json(post);
});

// POST /api/posts
router.post('/', (req, res) => {
  const newPost = { ...req.body, id: String(Date.now()), createdAt: new Date().toISOString() };
  res.status(201).json(newPost);
});

// DELETE /api/posts/:id
router.delete('/:id', (req, res) => {
  res.status(200).json({ message: `Post ${req.params.id} deleted (stub)` });
});

export default router;