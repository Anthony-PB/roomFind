import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearAuth, authHeaders } from '../auth';
import { apiFetch } from '../api';

interface ReqItem {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  postTitle: string;
  status: string;
}

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const [pendingReceived, setPendingReceived] = useState<ReqItem[]>([]);
  const [acceptedSent, setAcceptedSent] = useState<ReqItem[]>([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/requests', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { received?: ReqItem[]; sent?: ReqItem[] }) => {
        setPendingReceived((data.received ?? []).filter(r => r.status === 'pending'));
        setAcceptedSent((data.sent ?? []).filter(r => r.status === 'accepted'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const totalCount = pendingReceived.length + acceptedSent.length;
  const hasNotifications = totalCount > 0;

  return (
    <nav className="navbar">
      <Link to="/browse" className="nav-brand">RoomFind</Link>
      <div className="nav-links">
        <Link to="/browse">Browse</Link>
        <Link to="/map">Map</Link>
        {user ? (
          <>
            <Link to="/posts/new">Post</Link>
            <Link to="/messages">Messages</Link>
            <Link to="/profile">Profile</Link>

            {/* Notification bell */}
            <div className="notif-bell-wrap" ref={bellRef}>
              <button
                className={`notif-bell${hasNotifications ? ' notif-bell--active' : ''}`}
                onClick={() => setOpen(o => !o)}
                title="Notifications"
              >
                &#128276;
                {hasNotifications && (
                  <span className="notif-badge">{totalCount > 9 ? '9+' : totalCount}</span>
                )}
              </button>

              {open && (
                <div className="notif-dropdown">
                  <div className="notif-header">Notifications</div>

                  {!hasNotifications && (
                    <div className="notif-empty">You're all caught up</div>
                  )}

                  {pendingReceived.length > 0 && (
                    <div className="notif-section">
                      <div className="notif-section-label">Needs your response</div>
                      {pendingReceived.map(r => (
                        <Link
                          key={r.id}
                          to="/requests"
                          className="notif-item"
                          onClick={() => setOpen(false)}
                        >
                          <div className="notif-dot notif-dot--pending" />
                          <div>
                            <div className="notif-item-title">
                              <strong>{r.fromUserName}</strong> wants to room with you
                            </div>
                            <div className="notif-item-sub">Re: {r.postTitle}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {acceptedSent.length > 0 && (
                    <div className="notif-section">
                      <div className="notif-section-label">Request accepted</div>
                      {acceptedSent.map(r => (
                        <Link
                          key={r.id}
                          to={`/messages/${r.toUserId}`}
                          className="notif-item"
                          onClick={() => setOpen(false)}
                        >
                          <div className="notif-dot notif-dot--accepted" />
                          <div>
                            <div className="notif-item-title">
                              <strong>{r.toUserName}</strong> accepted your request
                            </div>
                            <div className="notif-item-sub">Tap to message them →</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <Link to="/requests" className="notif-footer" onClick={() => setOpen(false)}>
                    View all requests
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontWeight: 500, fontSize: '1rem' }}
            >
              Logout ({user.name.split(' ')[0]})
            </button>
          </>
        ) : (
          <>
            <Link to="/register">Register</Link>
            <Link to="/login" className="nav-btn">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
}
