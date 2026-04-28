import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../auth';

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/browse" className="nav-brand">RoomFind</Link>
      <div className="nav-links">
        <Link to="/browse">Browse</Link>
        {user ? (
          <>
            <Link to="/posts/new">Post</Link>
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
