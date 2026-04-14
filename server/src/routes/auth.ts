import { Router } from 'express';
const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email.endsWith('.edu')) {
    return res.status(400).json({ error: 'Must use a .edu email address' });
  }

  // TODO: save to DB later
  res.status(201).json({ message: 'User registered (stub)', email, name });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email } = req.body;

  // TODO: verify password, return real JWT later
  res.status(200).json({
    token: 'stub-jwt-token',
    user: {
      id: '1',
      email,
      name: 'Test User',
      status: 'browsing',
      preferences: {
        sleepSchedule: 'flexible',
        noiseLevel: 3,
        cleanlinessLevel: 3,
        hasPets: false,
        preferredLocations: [],
      },
    },
  });
});

export default router;
