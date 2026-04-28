import { Router } from 'express';
import { db, auth } from '../firebase';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email.endsWith('.edu')) {
    return res.status(400).json({ error: 'Must use a .edu email address' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({ email, password, displayName: name });

    // Save user profile to Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      status: 'browsing',
      preferences: {
        sleepSchedule: 'flexible',
        noiseLevel: 3,
        cleanlinessLevel: 3,
        hasPets: false,
        preferredLocations: [],
      },
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'User registered successfully', uid: userRecord.uid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email } = req.body;

  try {
    // Get user from Firebase Auth by email
    const userRecord = await auth.getUserByEmail(email);
    
    // Get user profile from Firestore
    const doc = await db.collection('users').doc(userRecord.uid).get();

    res.status(200).json({
      uid: userRecord.uid,
      user: { id: doc.id, ...doc.data() },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;