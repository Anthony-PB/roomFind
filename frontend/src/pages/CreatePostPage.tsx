import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authHeaders, getToken } from '../auth';

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const MAX_W = 800, MAX_H = 600;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    location: '',
    budget: '',
    roomType: 'Double',
    moveInDate: '',
    noiseLevel: 3,
    cleanLevel: 3,
    sleepSchedule: '',
    pets: '',
    description: '',
    isSublet: false,
    availableFrom: '',
    availableTo: '',
    lat: '',
    lng: '',
    photos: [] as string[],
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => { if (!getToken()) navigate('/login'); }, []);

  const setStr = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const setNum = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: Number(e.target.value) }));

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 4 - form.photos.length;
    if (remaining <= 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(files.slice(0, remaining).map(compressImage));
      setForm(f => ({ ...f, photos: [...f.photos, ...compressed] }));
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setStatus({ type: 'error', msg: 'Please add a title.' }); return; }
    if (!form.location.trim()) { setStatus({ type: 'error', msg: 'Please enter a location.' }); return; }
    if (!form.budget || Number(form.budget) <= 0) { setStatus({ type: 'error', msg: 'Please enter a valid monthly budget.' }); return; }
    if (!form.moveInDate.trim()) { setStatus({ type: 'error', msg: 'Please enter a move-in date.' }); return; }

    setLoading(true);
    setStatus(null);
    try {
      const body: Record<string, unknown> = {
        ...form,
        budget: Number(form.budget),
        isSublet: String(form.isSublet),
      };
      if (!form.lat || !form.lng) { delete body['lat']; delete body['lng']; }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { message: string };
      if (res.ok) {
        navigate('/browse');
      } else if (res.status === 401) {
        setStatus({ type: 'error', msg: 'Session expired. Redirecting to login…' });
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setStatus({ type: 'error', msg: data.message ?? 'Failed to create listing.' });
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
              <input type="text" placeholder="e.g. Looking for roommate near East Campus" value={form.title} onChange={setStr('title')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Location / Address</label>
                <input type="text" placeholder="e.g. 0.5 mi from campus" value={form.location} onChange={setStr('location')} />
              </div>
              <div className="form-group">
                <label>Budget ($/mo)</label>
                <input type="number" placeholder="e.g. 750" value={form.budget} onChange={setStr('budget')} min={1} />
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
                <input type="text" placeholder="e.g. Aug 2026" value={form.moveInDate} onChange={setStr('moveInDate')} />
              </div>
            </div>

            {/* Sublet toggle */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="isSublet"
                checked={form.isSublet}
                onChange={e => setForm(f => ({ ...f, isSublet: e.target.checked }))}
                style={{ width: 'auto' }}
              />
              <label htmlFor="isSublet" style={{ margin: 0 }}>This is a sublet (temporary availability)</label>
            </div>
            {form.isSublet && (
              <div className="form-row">
                <div className="form-group">
                  <label>Available From</label>
                  <input type="text" placeholder="e.g. May 2026" value={form.availableFrom} onChange={setStr('availableFrom')} />
                </div>
                <div className="form-group">
                  <label>Available Until</label>
                  <input type="text" placeholder="e.g. Aug 2026" value={form.availableTo} onChange={setStr('availableTo')} />
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="form-section">
            <h2>Photos <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#4a5568' }}>(optional, up to 4)</span></h2>
            {form.photos.length < 4 && (
              <div
                className={`photo-upload-area${compressing ? ' photo-upload-area--busy' : ''}`}
                onClick={() => !compressing && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoAdd}
                />
                <span style={{ fontSize: '1.5rem' }}>&#128247;</span>
                <span style={{ fontWeight: 600 }}>{compressing ? 'Compressing…' : 'Click to add photos'}</span>
                <span style={{ fontSize: '0.8rem', color: '#718096' }}>JPG, PNG, WEBP — auto-compressed</span>
              </div>
            )}
            {form.photos.length > 0 && (
              <div className="photo-preview-grid">
                {form.photos.map((photo, i) => (
                  <div key={i} className="photo-preview-item">
                    <img src={photo} alt="" />
                    <button type="button" className="photo-preview-remove" onClick={() => removePhoto(i)}>&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Living Style */}
          <div className="form-section">
            <h2>Your Living Style</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Sleep Schedule</label>
                <select value={form.sleepSchedule} onChange={setStr('sleepSchedule')}>
                  <option value="">Prefer not to say</option>
                  <option value="early-bird">Early Bird (before 10 PM)</option>
                  <option value="average">Average (10 PM – midnight)</option>
                  <option value="night-owl">Night Owl (after midnight)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Pets</label>
                <select value={form.pets} onChange={setStr('pets')}>
                  <option value="">Prefer not to say</option>
                  <option value="no">No pets</option>
                  <option value="ok">Pet-friendly</option>
                  <option value="have">I have pets</option>
                </select>
              </div>
            </div>
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

          {/* Map pin (optional) */}
          <div className="form-section">
            <h2>Map Pin (optional)</h2>
            <p style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.75rem' }}>
              Add coordinates so your listing appears on the map. Find them on{' '}
              <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" style={{ color: '#2952d9' }}>OpenStreetMap</a>{' '}
              (right-click → "Show address") or Google Maps (right-click the spot).
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input type="number" step="any" placeholder="e.g. 42.3601" value={form.lat} onChange={setStr('lat')} />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input type="number" step="any" placeholder="e.g. -71.0589" value={form.lng} onChange={setStr('lng')} />
              </div>
            </div>
          </div>

          {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

          <div className="form-actions">
            <Link to="/browse" className="btn-cancel">Cancel</Link>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} disabled={loading || compressing}>
              {loading ? 'Posting…' : 'Post Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
