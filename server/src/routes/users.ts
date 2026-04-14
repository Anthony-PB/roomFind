import { Router } from 'express';
const router = Router();

// GET /api/users/:id
router.get('/:id', (req, res) => {
  res.status(200).json({
    id: req.params.id,
    name: 'Stub User',
    email: 'stub@cornell.edu',
    status: 'actively_looking',
    preferences: {
      sleepSchedule: 'night_owl',
      noiseLevel: 3,
      cleanlinessLevel: 4,
      hasPets: false,
      preferredLocations: ['gym', 'library'],
    },
  });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  res.status(200).json({ message: 'Profile updated (stub)', ...req.body });
});

export default router;