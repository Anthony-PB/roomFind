import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authHeaders, getToken } from '../auth';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    location: '',
    budget: '',
    roomType: 'Double',
    moveInDate: '',
    noiseLevel: 3,
    cleanLevel: 3,
    description: '',
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
    }
  }, []);

  const setStr = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: Number(e.target.value) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setStatus({ type: 'error', msg: 'Please add a title for your listing.' });
      return;
    }
    if (!form.location.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a location.' });
      return;
    }
    if (!form.budget || Number(form.budget) <= 0) {
      setStatus({ type: 'error', msg: 'Please enter a valid monthly budget.' });
      return;
    }
    if (!form.moveInDate.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a move-in date.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...form, budget: Number(form.budget) }),
      });
      const data = await res.json() as { message: string };
      if (res.ok) {
        navigate('/browse');
      } else if (res.status === 401) {
        setStatus({ type: 'error', msg: 'Your session expired. Please log in again.' });
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setStatus({ type: 'error', msg: data.message ?? 'Failed to create listing. Please try again.' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Cannot connect to server. Make sure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-page">
      <div className="page-header">
        <h1>Post a Listing</h1>
        <p className="subtitle">Let other students find you as a roommate</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>

          {/* Basic Info */}
          <div className="form-section">
            <h2>Basic Info</h2>
            <div className="form-group">
              <label>Listing Title</label>
              <input
                type="text"
                placeholder="e.g. Looking for roommate near East Campus"
                value={form.title}
                onChange={setStr('title')}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="e.g. 0.5 mi from campus"
                  value={form.location}
                  onChange={setStr('location')}
                />
              </div>
              <div className="form-group">
                <label>Budget ($/mo)</label>
                <input
                  type="number"
                  placeholder="e.g. 750"
                  value={form.budget}
                  onChange={setStr('budget')}
                  min={1}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Room Type</label>
                <select value={form.roomType} onChange={setStr('roomType')}>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Suite">Suite</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>
              <div className="form-group">
                <label>Move-in Date</label>
                <input
                  type="text"
                  placeholder="e.g. Aug 2026"
                  value={form.moveInDate}
                  onChange={setStr('moveInDate')}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="form-section">
            <h2>Your Living Style</h2>
            <div className="slider-group">
              <label>
                <span>Noise Level</span>
                <span>{form.noiseLevel} / 5</span>
              </label>
              <input type="range" min={1} max={5} value={form.noiseLevel} onChange={setNum('noiseLevel')} />
            </div>
            <div className="slider-group">
              <label>
                <span>Cleanliness</span>
                <span>{form.cleanLevel} / 5</span>
              </label>
              <input type="range" min={1} max={5} value={form.cleanLevel} onChange={setNum('cleanLevel')} />
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <h2>Description</h2>
            <div className="form-group">
              <label>Tell potential roommates about yourself</label>
              <textarea
                placeholder="e.g. CS junior, usually quiet, clean, looking for someone chill to split a double..."
                value={form.description}
                onChange={setStr('description')}
                rows={4}
              />
            </div>
          </div>

          {status && (
            <div className={`status-msg ${status.type}`}>{status.msg}</div>
          )}

          <div className="form-actions">
            <Link to="/browse" className="btn-cancel">Cancel</Link>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} disabled={loading}>
              {loading ? 'Posting…' : 'Post Listing'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
