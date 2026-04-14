import type { Request, Response } from 'express';

// GET /api/users/:id
export const getUserById = (req: Request, res: Response) => {
  // TODO: Fetch user profile from DB (lifestyle prefs, preferred locations, status)
  res.json({ user: { id: req.params['id'] } });
};

// PUT /api/users/:id
export const updateUser = (req: Request, res: Response) => {
  // TODO: Update user's preferences: sleepSchedule, noiseLevel, cleanliness, pets,
  //       preferredLocations, status (Actively Looking / Browsing / Found Roommate)
  res.json({ message: 'Profile updated', user: { id: req.params['id'], ...req.body } });
};

// DELETE /api/users/:id
export const deleteUser = (req: Request, res: Response) => {
  // TODO: Verify requester owns the account, delete user and their posts from DB
  res.json({ message: 'User deleted', id: req.params['id'] });
};
