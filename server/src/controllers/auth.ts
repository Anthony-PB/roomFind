import type { Request, Response } from 'express';

// POST /api/auth/register
export const register = (req: Request, res: Response) => {
  // TODO: Validate .edu email, check user doesn't already exist
  // TODO: Hash password with bcrypt, save user to DB
  // TODO: Return JWT token
  const { email, password, name } = req.body as { email: string; password: string; name: string };
  console.log('Register:', email, name, password ? '[password provided]' : '[no password]');
  res.status(201).json({ message: 'User registered successfully' });
};

// POST /api/auth/login
export const login = (req: Request, res: Response) => {
  // TODO: Look up user by email, verify hashed password
  // TODO: Return signed JWT token
  const { email } = req.body as { email: string };
  console.log('Login attempt:', email);
  res.status(200).json({ message: 'Login successful', token: 'placeholder-token' });
};
