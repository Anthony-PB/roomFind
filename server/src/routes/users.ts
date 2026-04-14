import { Router } from 'express';
import { getUserById, updateUser, deleteUser } from '../controllers/users';

const router = Router();

// GET /api/users/:id — get a user's profile and preferences
router.get('/:id', getUserById);

// PUT /api/users/:id — update profile, preferences, and status
router.put('/:id', updateUser);

// DELETE /api/users/:id — delete a user account
router.delete('/:id', deleteUser);

export default router;
