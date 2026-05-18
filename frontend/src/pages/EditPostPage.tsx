import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authHeaders, getToken } from '../auth';
import { apiFetch } from '../api';

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

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const STATE_ABBR: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
  'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
  'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
};

function trimAddress(displayName: string): string {
  const parts = displayName.split(', ');
  const stateAbbr = parts.map(p => STATE_ABBR[p]).find(Boolean) ?? '';
  const cleaned = parts
    .map(p => p.replace(/^(City|Town|Village|Township) of /, ''))
    .filter(p => !p.match(/^\d{5}(-\d{4})?$/) && !p.includes('County') && p !== 'United States' && !STATE_ABBR[p]);
  return [cleaned[0], cleaned[1], stateAbbr].filter(Boolean).join(', ');
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return; }
    apiFetch(`/api/posts/${id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { post: Record<string, unknown> }) => {
        const p = data.post;
        if (!p) { setNotFound(true); return; }
        setForm({
          title: String(p['title'] ?? ''),
          location: String(p['location'] ?? ''),
          budget: String(p['budget'] ?? ''),
          roomType: String(p['roomType'] ?? 'Double'),
          moveInDate: String(p['moveInDate'] ?? ''),
          noiseLevel: Number(p['noiseLevel'] ?? 3),
          cleanLevel: Number(p['cleanLevel'] ?? 3),
          sleepSchedule: String(p['sleepSchedule'] ?? ''),
          pets: String(p['pets'] ?? ''),
          description: String(p['description'] ?? ''),
          isSublet: Boolean(p['isSublet']),
          availableFrom: String(p['availableFrom'] ?? ''),
          availableTo: String(p['availableTo'] ?? ''),
          lat: p['lat'] !== undefined ? String(p['lat']) : '',
          lng: p['lng'] !== undefined ? String(p['lng']) : '',
          photos: Array.isArray(p['photos']) ? (p['photos'] as string[]) : [],
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingPost(false));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = useCallback((query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us&viewbox=-77.1,42.2,-76.2,42.7&bounded=0`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(r => r.json())
      .then((results: NominatimResult[]) => { setSuggestions(results); setShowSuggestions(true); })
      .catch(() => setSuggestions([]));
  }, []);

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(f => ({ ...f, location: val, lat: '', lng: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 350);
  };

  const handleSuggestionSelect = (s: NominatimResult) => {
    setForm(f => ({ ...f, location: trimAddress(s.display_name), lat: s.lat, lng: s.lon }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

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
        isSublet: form.isSublet,
      };
      if (!form.lat || !form.lng) { delete body['lat']; delete body['lng']; }

      const res = await apiFetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { message: string };
      if (res.ok) {
        navigate('/browse?tab=mine');
      } else if (res.status === 401) {
        setStatus({ type: 'error', msg: 'Session expired. Redirecting to login…' });
        setTimeout(() => navigate('/login'), 1500);
      } else if (res.status === 403) {
        setStatus({ type: 'error', msg: 'You can only edit your own listings.' });
      } else {
        setStatus({ type: 'error', msg: data.message ?? 'Failed to update listing.' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Cannot connect to server. Make sure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) return <div className="loading" style={{ padding: '3rem' }}>Loading listing…</div>;
  if (notFound) return <div className="loading" style={{ padding: '3rem' }}>Listing not found.</div>;

  return (
    <div className="create-post-page">
      <div className="page-header">
        <h1>Edit Listing</h1>
        <p className="subtitle">Update your listing details</p>
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
              <div className="form-group" ref={locationWrapperRef} style={{ position: 'relative' }}>
                <label>Location / Address</label>
                <input
                  type="text"
                  placeholder="Start typing an address…"
                  value={form.location}
                  onChange={handleLocationInput}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                />
                {form.lat && (
                  <div style={{ fontSize: '0.75rem', color: '#48bb78', marginTop: '0.25rem' }}>
                    Pinned on map
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #c8d0dc', borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', listStyle: 'none',
                    margin: 0, padding: 0, maxHeight: '200px', overflowY: 'auto',
                  }}>
                    {suggestions.map(s => (
                      <li
                        key={s.place_id}
                        onMouseDown={() => handleSuggestionSelect(s)}
                        style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #eef0f4' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
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
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoAdd} />
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
              <label><span>Noise Level</span><span>{form.noiseLevel} / 5</span></label>
              <input type="range" min={1} max={5} value={form.noiseLevel} onChange={setNum('noiseLevel')} />
            </div>
            <div className="slider-group">
              <label><span>Cleanliness</span><span>{form.cleanLevel} / 5</span></label>
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

          {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

          <div className="form-actions">
            <Link to="/browse?tab=mine" className="btn-cancel">Cancel</Link>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} disabled={loading || compressing}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
