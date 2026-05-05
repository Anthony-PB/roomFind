import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';

interface Post {
  id: string;
  authorId?: string;
  authorName?: string;
  title: string;
  location: string;
  budget: number;
  roomType: string;
  moveInDate: string;
  noiseLevel: number;
  cleanLevel: number;
  description?: string;
  matchScore?: number;
  sleepSchedule?: string;
  pets?: string;
  isSublet?: boolean;
  availableFrom?: string;
  availableTo?: string;
}

const MOCK_POSTS: Post[] = [
  { id: 'mock-1', title: 'Looking for roommate near campus', location: '0.3 mi from main campus', budget: 800, roomType: 'Double', moveInDate: 'Aug 2026', noiseLevel: 3, cleanLevel: 4 },
  { id: 'mock-2', title: 'Quiet student seeks off-campus suite mate', location: '0.8 mi from campus', budget: 650, roomType: 'Suite', moveInDate: 'Sep 2026', noiseLevel: 1, cleanLevel: 5 },
  { id: 'mock-3', title: 'Apartment sublet available — summer only', location: '1.2 mi from campus', budget: 500, roomType: 'Studio', moveInDate: 'May 2026', noiseLevel: 2, cleanLevel: 3, isSublet: true },
];

export default function BrowsePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({ maxBudget: '', roomType: '' });
  const [appliedFilters, setAppliedFilters] = useState({ maxBudget: '', roomType: '' });
  const [sort, setSort] = useState('score');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'saved'>('all');
  const user = getUser();

  // Load bookmark IDs for logged-in users
  useEffect(() => {
    if (!user) return;
    fetch('/api/bookmarks/ids', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { ids: string[] }) => setBookmarkedIds(new Set(data.ids ?? [])))
      .catch(() => {});
  }, []);

  // Fetch posts when filters or sort change
  useEffect(() => {
    if (tab === 'saved') { loadSaved(); return; }
    setLoading(true);
    setServerDown(false);
    const params = new URLSearchParams();
    if (appliedFilters.maxBudget) params.set('budget', appliedFilters.maxBudget);
    if (appliedFilters.roomType) params.set('roomType', appliedFilters.roomType);
    params.set('sort', sort);

    fetch(`/api/posts?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => {
        setServerDown(true);
        let fb = MOCK_POSTS;
        if (appliedFilters.maxBudget) fb = fb.filter(p => p.budget <= Number(appliedFilters.maxBudget));
        if (appliedFilters.roomType) fb = fb.filter(p => p.roomType === appliedFilters.roomType);
        setPosts(fb);
      })
      .finally(() => setLoading(false));
  }, [appliedFilters, sort, tab]);

  const loadSaved = () => {
    if (!user) return;
    setLoading(true);
    fetch('/api/bookmarks', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  const applyFilters = () => setAppliedFilters(pendingFilters);
  const clearFilters = () => { setPendingFilters({ maxBudget: '', roomType: '' }); setAppliedFilters({ maxBudget: '', roomType: '' }); };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    setTogglingId(postId);
    const isBookmarked = bookmarkedIds.has(postId);
    try {
      const res = await fetch(`/api/bookmarks/${postId}`, {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 409) {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          isBookmarked ? next.delete(postId) : next.add(postId);
          return next;
        });
        if (tab === 'saved' && isBookmarked) setPosts(p => p.filter(x => x.id !== postId));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) setPosts(p => p.filter(post => post.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = appliedFilters.maxBudget || appliedFilters.roomType;

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>Find a Roommate</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/map" className="btn-secondary">Map View</Link>
          <Link to={user ? '/posts/new' : '/login'} className="btn-post">+ Post a Listing</Link>
        </div>
      </div>

      {serverDown && (
        <div className="status-msg error" style={{ marginBottom: '1rem' }}>
          Cannot reach server — showing demo listings.
        </div>
      )}

      {user && (
        <div className="tab-bar" style={{ marginBottom: '1rem' }}>
          <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Listings</button>
          <button className={`tab-btn ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>Saved</button>
        </div>
      )}

      <div className="browse-layout">
        <aside className="filter-panel">
          <h2>Filters</h2>
          <div className="form-group">
            <label>Max Budget ($/mo)</label>
            <input
              type="number"
              placeholder="e.g. 900"
              value={pendingFilters.maxBudget}
              onChange={e => setPendingFilters(f => ({ ...f, maxBudget: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="form-group">
            <label>Room Type</label>
            <select value={pendingFilters.roomType} onChange={e => setPendingFilters(f => ({ ...f, roomType: e.target.value }))}>
              <option value="">Any</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Suite">Suite</option>
              <option value="Studio">Studio</option>
            </select>
          </div>
          <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={applyFilters}>Apply</button>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ width: '100%', marginTop: '0.5rem', background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}

          <h2 style={{ marginTop: '1.5rem' }}>Sort By</h2>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #c8d0dc', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem' }}>
            <option value="score">Match Score</option>
            <option value="budget">Budget (low → high)</option>
            <option value="date">Newest First</option>
          </select>

          {!user && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f4ff', borderRadius: 8, fontSize: '0.85rem', color: '#2d3748' }}>
              <strong>Want match scores?</strong><br />
              <Link to="/register" style={{ color: '#2952d9' }}>Sign up</Link> and set your preferences.
            </div>
          )}
        </aside>

        <section className="posts-list">
          {loading ? (
            <div className="loading">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="loading">
              {tab === 'saved' ? 'No saved listings yet. Bookmark posts by clicking ♡.' :
                hasActiveFilters ? 'No listings match your filters.' : 'No listings yet — be the first to post!'}
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="post-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <h3 style={{ margin: 0, flex: 1 }}>{post.title}</h3>
                    {post.isSublet && <span className="tag tag-sublet">Sublet</span>}
                  </div>
                  {post.authorName && (
                    <div style={{ fontSize: '0.8rem', color: '#4a5568', marginBottom: '0.4rem' }}>
                      by{' '}
                      {post.authorId ? (
                        <Link to={`/users/${post.authorId}`} style={{ color: '#2952d9', fontWeight: 600 }}>
                          {post.authorName}
                        </Link>
                      ) : post.authorName}
                    </div>
                  )}
                  <div className="post-meta">
                    <span>{post.location}</span>
                    <span>${post.budget}/mo</span>
                    <span>{post.moveInDate}</span>
                  </div>
                  <div className="post-meta" style={{ marginTop: '0.5rem' }}>
                    <span className="tag">{post.roomType}</span>
                    <span className="tag">Noise {post.noiseLevel}/5</span>
                    <span className="tag">Clean {post.cleanLevel}/5</span>
                    {post.sleepSchedule && <span className="tag">{post.sleepSchedule}</span>}
                    {post.pets && post.pets !== 'no' && <span className="tag">Pets: {post.pets}</span>}
                  </div>
                  {post.isSublet && post.availableFrom && (
                    <div className="post-meta" style={{ marginTop: '0.3rem' }}>
                      <span>Available {post.availableFrom}{post.availableTo ? ` – ${post.availableTo}` : ''}</span>
                    </div>
                  )}
                  {post.description && <p className="post-description">{post.description}</p>}
                </div>

                <div className="post-card-right">
                  {post.matchScore !== undefined && (
                    <div className="match-score">
                      <div className="score">{post.matchScore}</div>
                      <div className="label">match</div>
                    </div>
                  )}

                  {/* Bookmark */}
                  {user && (
                    <button
                      className={`btn-bookmark ${bookmarkedIds.has(post.id) ? 'saved' : ''}`}
                      onClick={() => toggleBookmark(post.id)}
                      disabled={togglingId === post.id}
                      title={bookmarkedIds.has(post.id) ? 'Remove bookmark' : 'Save'}
                    >
                      {bookmarkedIds.has(post.id) ? '♥' : '♡'}
                    </button>
                  )}

                  {/* Request button (not your own post) */}
                  {user && post.authorId && post.authorId !== user.id && (
                    <Link to={`/users/${post.authorId}`} className="btn-request">
                      Request
                    </Link>
                  )}

                  {/* Delete (own post) */}
                  {user && post.authorId === user.id && (
                    <button className="btn-delete" onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}>
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
