import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import BrowsePage from './pages/BrowsePage';
import ProfilePage from './pages/ProfilePage';

type Page = 'login' | 'browse' | 'profile';

const App = () => {
  const [page, setPage] = useState<Page>('login');

  return (
    <div>
      <nav style={{ background: '#333', padding: '10px 20px', display: 'flex', gap: 16 }}>
        {(['login', 'browse', 'profile'] as Page[]).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              background: page === p ? '#4CAF50' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {p}
          </button>
        ))}
      </nav>

      {page === 'login' && <LoginPage />}
      {page === 'browse' && <BrowsePage />}
      {page === 'profile' && <ProfilePage />}
    </div>
  );
};

export default App;