import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';

interface OtherUser {
  id: string;
  name: string;
  email: string;
  preferences?: {
    sleepSchedule?: string;
    noiseLevel?: number;
    cleanliness?: number;
    pets?: string;
    status?: string;
  };
}

interface Post {
  id: string;
  title: string;
  location: string;
  budget: number;
  roomType: string;
  moveInDate: string;
  noiseLevel: number;
  cleanLevel: number;
  description?: string;
  isSublet?: boolean;
}

const SLEEP_LABEL: Record<string, string> = {
  'early-bird': 'Early Bird',
  average: 'Average',
  'night-owl': 'Night Owl',
};

const STATUS_LABEL: Record<string, string> = {
  'actively-looking': 'Actively Looking',
  browsing: 'Browsing',
  found: 'Found Roommate',
};

const PETS_LABEL: Record<string, string> = {
  no: 'No Pets',
  ok: 'Pet-Friendly',
  have: 'Has Pets',
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = getUser();

  const [profile, setProfile] = useState<OtherUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqMsg, setReqMsg] = useState('');
  const [reqStatus, setReqStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reqPostId, setReqPostId] = useState<string>('');

  useEffect(() => {
    if (!me) { navigate('/login'); return; }
    if (id === me.id) { navigate('/profile'); return; }

    Promise.all([
      fetch(`/api/users/${id}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/posts?sort=date`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([userData, postsData]) => {
        setProfile(userData.user ?? null);
        const userPosts = (postsData.posts as (Post & { authorId?: string })[]).filter(
          p => p.authorId === id
        );
        setPosts(userPosts);
        if (userPosts.length > 0) setReqPostId(userPosts[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const sendRequest = async () => {
    if (!reqPostId) return;
    setReqStatus('sending');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ toUserId: id, postId: reqPostId, message: reqMsg }),
      });
      setReqStatus(res.ok ? 'sent' : 'error');
    } catch {
      setReqStatus('error');
    }
  };

  if (loading) return <div className="loading" style={{ padding: '3rem' }}>Loading profile…</div>;
  if (!profile) return <div className="loading" style={{ padding: '3rem' }}>User not found.</div>;

  const prefs = profile.preferences;

  return (
    <div className="user-profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{profile.name}</h1>
          <p className="subtitle">{profile.email}</p>
          {prefs?.status && (
            <span className={`status-badge status-${prefs.status}`}>
              {STATUS_LABEL[prefs.status] ?? prefs.status}
            </span>
          )}
        </div>
        <div className="profile-hero-actions">
          <Link to={`/messages/${id}`} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.4rem', textDecoration: 'none', display: 'inline-block' }}>
            Message
          </Link>
        </div>
      </div>

      <div className="profile-sections" style={{ marginTop: '1.5rem' }}>
        {prefs && (
          <div className="profile-section">
            <h2>Lifestyle</h2>
            {prefs.sleepSchedule && (
              <div className="pref-row"><span>Sleep</span><strong>{SLEEP_LABEL[prefs.sleepSchedule] ?? prefs.sleepSchedule}</strong></div>
            )}
            {prefs.noiseLevel !== undefined && (
              <div className="pref-row"><span>Noise Tolerance</span><strong>{prefs.noiseLevel} / 5</strong></div>
            )}
            {prefs.cleanliness !== undefined && (
              <div className="pref-row"><span>Cleanliness</span><strong>{prefs.cleanliness} / 5</strong></div>
            )}
            {prefs.pets && (
              <div className="pref-row"><span>Pets</span><strong>{PETS_LABEL[prefs.pets] ?? prefs.pets}</strong></div>
            )}
          </div>
        )}

        {posts.length > 0 && (
          <div className="profile-section">
            <h2>Their Listings</h2>
            {posts.map(post => (
              <div key={post.id} className="post-card" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem' }}>{post.title}</h3>
                  <div className="post-meta">
                    <span>{post.location}</span>
                    <span>${post.budget}/mo</span>
                    <span className="tag">{post.roomType}</span>
                    {post.isSublet && <span className="tag tag-sublet">Sublet</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {posts.length > 0 && (
          <div className="profile-section">
            <h2>Send Roommate Request</h2>
            {reqStatus === 'sent' ? (
              <p style={{ color: '#276749', fontWeight: 600 }}>Request sent!</p>
            ) : (
              <>
                {posts.length > 1 && (
                  <div className="form-group">
                    <label>For listing</label>
                    <select value={reqPostId} onChange={e => setReqPostId(e.target.value)}>
                      {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Message (optional)</label>
                  <textarea
                    rows={3}
                    value={reqMsg}
                    onChange={e => setReqMsg(e.target.value)}
                    placeholder="Introduce yourself…"
                  />
                </div>
                {reqStatus === 'error' && (
                  <p style={{ color: '#c53030', fontSize: '0.875rem' }}>Failed to send. Try again.</p>
                )}
                <button className="btn-save" onClick={sendRequest} disabled={reqStatus === 'sending'}>
                  {reqStatus === 'sending' ? 'Sending…' : 'Send Request'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
