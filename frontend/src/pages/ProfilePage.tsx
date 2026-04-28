import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authHeaders, getUser } from '../auth';

interface Preferences {
  sleepSchedule: string;
  noiseLevel: number;
  cleanliness: number;
  pets: string;
  status: string;
  gymProximity: number;
  diningProximity: number;
  studySpotsProximity: number;
}

const DEFAULT_PREFS: Preferences = {
  sleepSchedule: 'night-owl',
  noiseLevel: 3,
  cleanliness: 3,
  pets: 'no',
  status: 'actively-looking',
  gymProximity: 3,
  diningProximity: 3,
  studySpotsProximity: 3,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getUser();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetch('/api/users/me', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { user: { preferences?: Preferences } }) => {
        if (data.user?.preferences && Object.keys(data.user.preferences).length > 0) {
          setPrefs(data.user.preferences);
        }
      })
      .catch(() => {/* keep defaults */});
  }, []);

  const setNum = (field: keyof Preferences) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPrefs(p => ({ ...p, [field]: Number(e.target.value) }));

  const setStr = (field: keyof Preferences) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setPrefs(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else if (res.status === 401) {
        setSaveStatus('error');
        navigate('/login');
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      <p className="subtitle">Set your preferences to get better roommate matches</p>

      <div className="profile-sections">
        {/* Lifestyle */}
        <div className="profile-section">
          <h2>Lifestyle</h2>

          <div className="form-group">
            <label>Sleep Schedule</label>
            <select value={prefs.sleepSchedule} onChange={setStr('sleepSchedule')}>
              <option value="early-bird">Early Bird (before 10 PM)</option>
              <option value="average">Average (10 PM – midnight)</option>
              <option value="night-owl">Night Owl (after midnight)</option>
            </select>
          </div>

          <div className="slider-group">
            <label>
              <span>Noise Tolerance</span>
              <span>{prefs.noiseLevel} / 5</span>
            </label>
            <input type="range" min={1} max={5} value={prefs.noiseLevel} onChange={setNum('noiseLevel')} />
          </div>

          <div className="slider-group">
            <label>
              <span>Cleanliness Level</span>
              <span>{prefs.cleanliness} / 5</span>
            </label>
            <input type="range" min={1} max={5} value={prefs.cleanliness} onChange={setNum('cleanliness')} />
          </div>

          <div className="form-group">
            <label>Pets</label>
            <select value={prefs.pets} onChange={setStr('pets')}>
              <option value="no">No pets</option>
              <option value="ok">Pet-friendly</option>
              <option value="have">I have pets</option>
            </select>
          </div>
        </div>

        {/* Location Priorities */}
        <div className="profile-section">
          <h2>Location Priorities</h2>

          <div className="slider-group">
            <label>
              <span>Gym Proximity</span>
              <span>{prefs.gymProximity} / 5</span>
            </label>
            <input type="range" min={1} max={5} value={prefs.gymProximity} onChange={setNum('gymProximity')} />
          </div>

          <div className="slider-group">
            <label>
              <span>Dining Hall Proximity</span>
              <span>{prefs.diningProximity} / 5</span>
            </label>
            <input type="range" min={1} max={5} value={prefs.diningProximity} onChange={setNum('diningProximity')} />
          </div>

          <div className="slider-group">
            <label>
              <span>Study Spots Proximity</span>
              <span>{prefs.studySpotsProximity} / 5</span>
            </label>
            <input type="range" min={1} max={5} value={prefs.studySpotsProximity} onChange={setNum('studySpotsProximity')} />
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Roommate Status</label>
            <select value={prefs.status} onChange={setStr('status')}>
              <option value="actively-looking">Actively Looking</option>
              <option value="browsing">Browsing</option>
              <option value="found">Found Roommate</option>
            </select>
          </div>
        </div>

        <div className="save-bar">
          {saveStatus === 'saved' && <span style={{ color: '#276749', fontWeight: 600 }}>Preferences saved!</span>}
          {saveStatus === 'error' && <span style={{ color: '#c53030', fontWeight: 600 }}>Failed to save — please try again.</span>}
          <button className="btn-save" onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
