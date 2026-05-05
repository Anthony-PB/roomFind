import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';

interface RoommateRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  postId: string;
  postTitle: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const me = getUser();
  const [sent, setSent] = useState<RoommateRequest[]>([]);
  const [received, setReceived] = useState<RoommateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!me) { navigate('/login'); return; }
    fetch('/api/requests', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { sent: RoommateRequest[]; received: RoommateRequest[] }) => {
        setSent(data.sent ?? []);
        setReceived(data.received ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReceived(r => r.map(req => (req.id === id ? { ...req, status } : req)));
      }
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = received.filter(r => r.status === 'pending').length;

  if (loading) return <div className="loading" style={{ padding: '3rem' }}>Loading requests…</div>;

  return (
    <div className="requests-page">
      <h1>Roommate Requests</h1>

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'received' ? 'active' : ''}`}
          onClick={() => setTab('received')}
        >
          Received {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
        </button>
        <button
          className={`tab-btn ${tab === 'sent' ? 'active' : ''}`}
          onClick={() => setTab('sent')}
        >
          Sent
        </button>
      </div>

      {tab === 'received' && (
        <div className="req-list">
          {received.length === 0 ? (
            <p className="loading">No requests received yet.</p>
          ) : (
            received.map(req => (
              <div key={req.id} className="req-card">
                <div className="req-card-top">
                  <Link to={`/users/${req.fromUserId}`} className="req-name">{req.fromUserName}</Link>
                  <span className={`status-badge status-${req.status}`}>{req.status}</span>
                </div>
                <p className="req-listing">Re: <em>{req.postTitle}</em></p>
                {req.message && <p className="req-message">"{req.message}"</p>}
                <p className="req-date">{new Date(req.createdAt).toLocaleDateString()}</p>
                {req.status === 'pending' && (
                  <div className="req-actions">
                    <button
                      className="btn-accept"
                      disabled={updating === req.id}
                      onClick={() => respond(req.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-decline"
                      disabled={updating === req.id}
                      onClick={() => respond(req.id, 'declined')}
                    >
                      Decline
                    </button>
                    <Link to={`/messages/${req.fromUserId}`} className="btn-msg-link">
                      Message
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'sent' && (
        <div className="req-list">
          {sent.length === 0 ? (
            <p className="loading">You haven't sent any requests yet. <Link to="/browse">Browse listings →</Link></p>
          ) : (
            sent.map(req => (
              <div key={req.id} className="req-card">
                <div className="req-card-top">
                  <Link to={`/users/${req.toUserId}`} className="req-name">To: {req.toUserName}</Link>
                  <span className={`status-badge status-${req.status}`}>{req.status}</span>
                </div>
                <p className="req-listing">Re: <em>{req.postTitle}</em></p>
                {req.message && <p className="req-message">"{req.message}"</p>}
                <p className="req-date">{new Date(req.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
