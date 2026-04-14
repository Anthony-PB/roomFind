import { useState, useEffect } from 'react';
import type { Post } from '../types';

const PostCard = ({ post }: { readonly post: Post }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <h3>{post.location} — ${post.budget}/mo</h3>
      {post.matchScore !== undefined && (
        <span style={{ background: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: 4 }}>
          {post.matchScore}% match
        </span>
      )}
    </div>
    <p>Posted by: {post.authorName}</p>
    <p>Room type: {post.roomType} | Move-in: {post.moveInDate}</p>
    <p>Noise: {post.noiseLevel}/5 | Clean: {post.cleanlinessLevel}/5</p>
    <p>{post.description}</p>
  </div>
);

const BrowsePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/posts');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        setError('Failed to load posts.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((p) =>
    p.location.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 1rem' }}>
      <h1>Browse Posts</h1>
      <input
        placeholder="Search by location or keyword..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 20, fontSize: 16 }}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && filteredPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {!loading && filteredPosts.length === 0 && <p>No posts found.</p>}
    </div>
  );
};

export default BrowsePage;