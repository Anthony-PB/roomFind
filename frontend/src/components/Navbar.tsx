import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearAuth, authHeaders } from '../auth';

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch('/api/requests', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { received?: { status: string }[] }) => {
        const count = data.received?.filter(r => r.status === 'pending').length ?? 0;
        setPendingRequests(count);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/browse" className="nav-brand">RoomFind</Link>
      <div className="nav-links">
        <Link to="/browse">Browse</Link>
        <Link to="/map">Map</Link>
        {user ? (
          <>
            <Link to="/posts/new">Post</Link>
            <Link to="/requests" style={{ position: 'relative' }}>
              Requests
              {pendingRequests > 0 && (
                <span className="badge" style={{ position: 'absolute', top: '-6px', right: '-14px' }}>
                  {pendingRequests}
                </span>
              )}
            </Link>
            <Link to="/messages">Messages</Link>
            <Link to="/profile">Profile</Link>
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
