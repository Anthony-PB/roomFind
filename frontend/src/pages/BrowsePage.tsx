import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';
import { apiFetch } from '../api';

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
  photos?: string[];
  lat?: number;
  lng?: number;
}

interface Lightbox {
  photos: string[];
  index: number;
}

const MOCK_POSTS: Post[] = [
  { id: 'mock-1', title: 'Looking for roommate near West Campus', location: '0.3 mi from West Campus', budget: 800, roomType: 'Double', moveInDate: 'Aug 2026', noiseLevel: 3, cleanLevel: 4 },
  { id: 'mock-2', title: 'Quiet Cornellian seeks off-campus suite mate', location: 'Collegetown, Ithaca, NY', budget: 750, roomType: 'Suite', moveInDate: 'Sep 2026', noiseLevel: 1, cleanLevel: 5 },
  { id: 'mock-3', title: 'Sublet available — summer only near Ag Quad', location: '0.5 mi from Ag Quad', budget: 550, roomType: 'Studio', moveInDate: 'May 2026', noiseLevel: 2, cleanLevel: 3, isSublet: true },
];

const STACK_TRANSFORMS = [
  '',
  'rotate(3deg) translate(2px, 1px)',
  'rotate(-5deg) translate(-4px, 3px)',
];

type Tab = 'all' | 'saved' | 'mine';

export default function BrowsePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({ maxBudget: '', roomType: '', isSublet: false });
  const [appliedFilters, setAppliedFilters] = useState({ maxBudget: '', roomType: '', isSublet: false });
  const [sort, setSort] = useState('score');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const [requestModal, setRequestModal] = useState<{ postId: string; toUserId: string; toUserName: string; postTitle: string } | null>(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [search, setSearch] = useState('');
  const user = getUser();

  // Read initial tab from URL (e.g. /browse?tab=mine from edit page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'mine' || t === 'saved') setTab(t);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightbox(l => l && { ...l, index: (l.index + 1) % l.photos.length });
      if (e.key === 'ArrowLeft') setLightbox(l => l && { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length });
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  // Close modals on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmDelete(null);
        closeRequestModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load bookmarks
  useEffect(() => {
    if (!user) return;
    apiFetch('/api/bookmarks/ids', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { ids: string[] }) => setBookmarkedIds(new Set(data.ids ?? [])))
      .catch(() => {});
  }, []);

  // Fetch posts
  useEffect(() => {
    if (tab === 'saved') { loadSaved(); return; }
    if (tab === 'mine') { loadMine(); return; }
    setLoading(true);
    setServerDown(false);
    const params = new URLSearchParams();
    if (appliedFilters.maxBudget) params.set('budget', appliedFilters.maxBudget);
    if (appliedFilters.roomType) params.set('roomType', appliedFilters.roomType);
    if (appliedFilters.isSublet) params.set('isSublet', 'true');
    params.set('sort', sort);

    apiFetch(`/api/posts?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => {
        setServerDown(true);
        let fb = MOCK_POSTS;
        if (appliedFilters.maxBudget) fb = fb.filter(p => p.budget <= Number(appliedFilters.maxBudget));
        if (appliedFilters.roomType) fb = fb.filter(p => p.roomType === appliedFilters.roomType);
        if (appliedFilters.isSublet) fb = fb.filter(p => p.isSublet);
        setPosts(fb);
      })
      .finally(() => setLoading(false));
  }, [appliedFilters, sort, tab]);

  const loadSaved = () => {
    if (!user) return;
    setLoading(true);
    apiFetch('/api/bookmarks', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  const loadMine = () => {
    if (!user) return;
    setLoading(true);
    apiFetch('/api/posts?sort=date', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts((data.posts ?? []).filter(p => p.authorId === user.id)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  const applyFilters = () => setAppliedFilters(pendingFilters);
  const clearFilters = () => {
    setPendingFilters({ maxBudget: '', roomType: '', isSublet: false });
    setAppliedFilters({ maxBudget: '', roomType: '', isSublet: false });
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    setTogglingId(postId);
    const isBookmarked = bookmarkedIds.has(postId);
    try {
      const res = await apiFetch(`/api/bookmarks/${postId}`, {
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

  const handleDelete = (id: string, title: string) => setConfirmDelete({ id, title });

  const confirmDeletePost = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) setPosts(p => p.filter(post => post.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const openRequestModal = (post: Post) => {
    setRequestMsg('');
    setRequestStatus('idle');
    setRequestModal({ postId: post.id, toUserId: post.authorId!, toUserName: post.authorName ?? 'them', postTitle: post.title });
  };

  const closeRequestModal = () => {
    setRequestModal(null);
    setRequestMsg('');
    setRequestStatus('idle');
  };

  const sendRequest = async () => {
    if (!requestModal) return;
    setRequestStatus('sending');
    try {
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ toUserId: requestModal.toUserId, postId: requestModal.postId, message: requestMsg }),
      });
      setRequestStatus(res.ok ? 'sent' : 'error');
    } catch {
      setRequestStatus('error');
    }
  };

  const hasActiveFilters = appliedFilters.maxBudget || appliedFilters.roomType || appliedFilters.isSublet;

  const visiblePosts = search.trim()
    ? posts.filter(p => {
        const q = search.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
      })
    : posts;

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
          <button className={`tab-btn ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My Listings</button>
        </div>
      )}

      <div className="browse-layout">
        <aside className="filter-panel">
          {tab !== 'mine' && (
            <>
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
              <label className="filter-check-label">
                <input
                  type="checkbox"
                  checked={pendingFilters.isSublet}
                  onChange={e => setPendingFilters(f => ({ ...f, isSublet: e.target.checked }))}
                  style={{ width: 'auto', marginRight: '0.4rem', accentColor: '#2952d9' }}
                />
                Sublets only
              </label>
              <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={applyFilters}>Apply</button>
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
            </>
          )}

          {tab === 'mine' && (
            <div>
              <h2>My Listings</h2>
              <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.5rem', lineHeight: 1.5 }}>
                Edit or delete your listings here. Filters don't apply — all your posts are shown.
              </p>
              <Link to="/posts/new" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}>
                + New Listing
              </Link>
            </div>
          )}

          {!user && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f4ff', borderRadius: 8, fontSize: '0.85rem', color: '#2d3748' }}>
              <strong>Want match scores?</strong><br />
              <Link to="/register" style={{ color: '#2952d9' }}>Sign up</Link> and set your preferences.
            </div>
          )}
        </aside>

        <section className="posts-list">
          <div className="search-bar-wrapper">
            <span className="search-icon">&#128269;</span>
            <input
              className="search-bar"
              type="text"
              placeholder="Search by keyword, major, preferences…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} title="Clear">&#10005;</button>
            )}
          </div>

          {loading ? (
            <div className="loading">Loading posts…</div>
          ) : visiblePosts.length === 0 ? (
            <div className="loading">
              {search ? `No listings match "${search}".` :
                tab === 'saved' ? 'No saved listings yet. Bookmark posts by clicking ♡.' :
                tab === 'mine' ? <span>You haven't posted any listings yet. <Link to="/posts/new" style={{ color: '#2952d9' }}>Create one →</Link></span> :
                hasActiveFilters ? 'No listings match your filters.' : 'No listings yet — be the first to post!'}
            </div>
          ) : (
            visiblePosts.map(post => {
              const stackPhotos = post.photos?.slice(0, 3) ?? [];
              const isOwn = user && post.authorId === user.id;
              return (
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
                      {post.lat !== undefined && (
                        <Link to={`/map?highlight=${post.id}`} className="map-pin-link" title="View on map">
                          &#128205; Map
                        </Link>
                      )}
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
                    {user && post.authorId && !isOwn && (
                      <button className="btn-request" onClick={() => openRequestModal(post)}>
                        Request
                      </button>
                    )}

                    {/* Edit + Delete (own post) */}
                    {isOwn && (
                      <>
                        <button className="btn-edit" onClick={() => navigate(`/posts/${post.id}/edit`)}>
                          Edit
                        </button>
                        <button className="btn-delete" onClick={() => handleDelete(post.id, post.title)} disabled={deletingId === post.id}>
                          {deletingId === post.id ? '…' : 'Delete'}
                        </button>
                      </>
                    )}

                    {/* Photo stack */}
                    {stackPhotos.length > 0 && (
                      <div
                        className="photo-stack"
                        onClick={() => setLightbox({ photos: post.photos!, index: 0 })}
                        title={`${post.photos!.length} photo${post.photos!.length > 1 ? 's' : ''} — click to view`}
                      >
                        {stackPhotos.map((photo, i) => (
                          <img
                            key={i}
                            src={photo}
                            className="photo-stack-img"
                            style={{ transform: STACK_TRANSFORMS[i] ?? '', zIndex: stackPhotos.length - i }}
                            alt=""
                          />
                        ))}
                        {post.photos!.length > 1 && (
                          <span className="photo-stack-count">{post.photos!.length}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Request modal */}
      {requestModal && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {requestStatus === 'sent' ? (
              <>
                <div className="modal-icon">&#10003;</div>
                <h2 className="modal-title">Request sent!</h2>
                <p className="modal-body">
                  {requestModal.toUserName} will see your request in their inbox.
                </p>
                <div className="modal-actions">
                  <Link to={`/messages/${requestModal.toUserId}`} className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '0.65rem 1rem' }}>
                    Message them
                  </Link>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={closeRequestModal}>Close</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title" style={{ marginBottom: '0.25rem' }}>Send Roommate Request</h2>
                <p className="modal-body" style={{ marginBottom: '1rem' }}>
                  To <strong>{requestModal.toUserName}</strong> for <em>"{requestModal.postTitle}"</em>
                </p>
                <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748', display: 'block', marginBottom: '0.4rem' }}>
                    Message <span style={{ fontWeight: 400, color: '#a0aec0' }}>(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={requestMsg}
                    onChange={e => setRequestMsg(e.target.value)}
                    placeholder="Introduce yourself…"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid #c8d0dc', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#3b6cf8')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#c8d0dc')}
                  />
                </div>
                {requestStatus === 'error' && (
                  <p style={{ color: '#c53030', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Failed to send — try again.</p>
                )}
                <div className="modal-actions">
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={closeRequestModal}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 1, margin: 0 }} onClick={sendRequest} disabled={requestStatus === 'sending'}>
                    {requestStatus === 'sending' ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon modal-icon--danger">&#128465;</div>
            <h2 className="modal-title">Delete listing?</h2>
            <p className="modal-body">
              <strong>"{confirmDelete.title}"</strong> will be permanently removed. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeletePost}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>&#10005;</button>
            {lightbox.photos.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={() => setLightbox(l => l && { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length })}>
                &#8249;
              </button>
            )}
            <img src={lightbox.photos[lightbox.index]} className="lightbox-img" alt="" />
            {lightbox.photos.length > 1 && (
              <button className="lightbox-nav lightbox-next" onClick={() => setLightbox(l => l && { ...l, index: (l.index + 1) % l.photos.length })}>
                &#8250;
              </button>
            )}
            {lightbox.photos.length > 1 && (
              <div className="lightbox-counter">{lightbox.index + 1} / {lightbox.photos.length}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
