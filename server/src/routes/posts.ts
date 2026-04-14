import { Router } from 'express';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/posts';

const router = Router();

// GET /api/posts — list all posts, sorted by matching score
router.get('/', getAllPosts);

// GET /api/posts/:id — get a single post by ID
router.get('/:id', getPostById);

// POST /api/posts — create a new roommate listing
router.post('/', createPost);

// PUT /api/posts/:id — update an existing listing
router.put('/:id', updatePost);

// DELETE /api/posts/:id — delete a listing
router.delete('/:id', deletePost);

export default router;
