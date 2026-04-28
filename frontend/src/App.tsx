import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowsePage from './pages/BrowsePage';
import ProfilePage from './pages/ProfilePage';
import CreatePostPage from './pages/CreatePostPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/posts/new" element={<CreatePostPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
