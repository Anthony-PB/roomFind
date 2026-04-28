import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';

interface Post {
  id: string;
  authorId?: string;
  title: string;
  location: string;
  budget: number;
  roomType: string;
  moveInDate: string;
  noiseLevel: number;
  cleanLevel: number;
  matchScore?: number;
  description?: string;
}

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Looking for roommate near campus',
    location: '0.3 mi from main campus',
    budget: 800,
    roomType: 'Double',
    moveInDate: 'Aug 2026',
    noiseLevel: 3,
    cleanLevel: 4,
    matchScore: 92,
  },
  {
    id: '2',
    title: 'Quiet student seeks off-campus suite mate',
    location: '0.8 mi from campus',
    budget: 650,
    roomType: 'Suite',
    moveInDate: 'Sep 2026',
    noiseLevel: 1,
    cleanLevel: 5,
    matchScore: 78,
  },
  {
    id: '3',
    title: 'Apartment sublet available — summer only',
    location: '1.2 mi from campus',
    budget: 500,
    roomType: 'Studio',
    moveInDate: 'May 2026',
    noiseLevel: 2,
    cleanLevel: 3,
    matchScore: 65,
  },
];

export default function BrowsePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ maxBudget: '', roomType: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const user = getUser();

  const fetchPosts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.maxBudget) params.set('budget', filters.maxBudget);
    if (filters.roomType) params.set('roomType', filters.roomType);

    fetch(`/api/posts?${params.toString()}`)
      .then(r => r.json())
      .then((data: { posts: Post[] }) => {
        setPosts(data.posts.length > 0 ? data.posts : MOCK_POSTS);
      })
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, [filters]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setPosts(p => p.filter(post => post.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>Find a Roommate</h1>
        {user && (
          <Link to="/posts/new" className="btn-post">+ Post a Listing</Link>
        )}
      </div>

      <div className="browse-layout">
        <aside className="filter-panel">
          <h2>Filters</h2>
          <div className="form-group">
            <label>Max Budget ($/mo)</label>
            <input
              type="number"
              placeholder="e.g. 900"
              value={filters.maxBudget}
              onChange={e => setFilters(f => ({ ...f, maxBudget: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Room Type</label>
            <select
              value={filters.roomType}
              onChange={e => setFilters(f => ({ ...f, roomType: e.target.value }))}
            >
              <option value="">Any</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Suite">Suite</option>
              <option value="Studio">Studio</option>
            </select>
          </div>
        </aside>

        <section className="posts-list">
          {loading ? (
            <div className="loading">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="loading">No listings found. Try adjusting your filters.</div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="post-card">
                <div style={{ flex: 1 }}>
                  <h3>{post.title}</h3>
                  <div className="post-meta">
                    <span>{post.location}</span>
                    <span>${post.budget}/mo</span>
                    <span>{post.moveInDate}</span>
                  </div>
                  <div className="post-meta" style={{ marginTop: '0.5rem' }}>
                    <span className="tag">{post.roomType}</span>
                    <span className="tag">Noise {post.noiseLevel}/5</span>
                    <span className="tag">Clean {post.cleanLevel}/5</span>
                  </div>
                  {post.description && (
                    <p className="post-description">{post.description}</p>
                  )}
                </div>
                <div className="post-card-right">
                  {post.matchScore !== undefined && (
                    <div className="match-score">
                      <div className="score">{post.matchScore}</div>
                      <div className="label">match</div>
                    </div>
                  )}
                  {user && post.authorId === user.id && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                    >
                      {deletingId === post.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
