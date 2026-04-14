import { Router } from 'express';
import { register, login } from '../controllers/auth';

const router = Router();

// POST /api/auth/register — create new account (requires .edu email)
router.post('/register', register);

// POST /api/auth/login — authenticate and return token
router.post('/login', login);

export default router;
