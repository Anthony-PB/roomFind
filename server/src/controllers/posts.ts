import type { Request, Response } from 'express';

// GET /api/posts
export const getAllPosts = (req: Request, res: Response) => {
  // TODO: Query DB for posts with optional filters (budget, roomType, moveInDate)
  // TODO: Compute matching score (0-100) per post based on requester's preferences
  // TODO: Return posts sorted by matching score descending
  const { budget, roomType, minScore } = req.query;
  console.log('Get posts, filters:', { budget, roomType, minScore });
  res.json({ posts: [] });
};

// GET /api/posts/:id
export const getPostById = (req: Request, res: Response) => {
  // TODO: Fetch single post by ID from DB, include poster's public profile
  res.json({ post: { id: req.params['id'] } });
};

// POST /api/posts
export const createPost = (req: Request, res: Response) => {
  // TODO: Validate body fields (location, budget, moveInDate, roomType, noiseLevel, cleanLevel)
  // TODO: Save new post to DB linked to authenticated user
  res.status(201).json({ message: 'Post created', post: req.body });
};

// PUT /api/posts/:id
export const updatePost = (req: Request, res: Response) => {
  // TODO: Verify requester owns the post, update fields in DB
  res.json({ message: 'Post updated', post: { id: req.params['id'], ...req.body } });
};

// DELETE /api/posts/:id
export const deletePost = (req: Request, res: Response) => {
  // TODO: Verify requester owns the post, remove from DB
  res.json({ message: 'Post deleted', id: req.params['id'] });
};
