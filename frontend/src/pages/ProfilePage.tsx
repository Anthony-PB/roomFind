import { useState } from 'react';
import type { UserPreferences } from '../types';

const ProfilePage = () => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    sleepSchedule: 'flexible',
    noiseLevel: 3,
    cleanlinessLevel: 3,
    hasPets: false,
    preferredLocations: [],
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('http://localhost:8080/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save preferences');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 1rem' }}>
      <h1>My Profile & Preferences</h1>

      <label>Sleep Schedule</label>
      <select
        value={prefs.sleepSchedule}
        onChange={(e) =>
          setPrefs({ ...prefs, sleepSchedule: e.target.value as UserPreferences['sleepSchedule'] })
        }
        style={{ display: 'block', width: '100%', marginBottom: 16, padding: 8 }}
      >
        <option value="early_bird">Early Bird</option>
        <option value="night_owl">Night Owl</option>
        <option value="flexible">Flexible</option>
      </select>

      <label>Noise Level: {prefs.noiseLevel}/5</label>
      <input
        type="range" min={1} max={5}
        value={prefs.noiseLevel}
        onChange={(e) => setPrefs({ ...prefs, noiseLevel: Number(e.target.value) })}
        style={{ display: 'block', width: '100%', marginBottom: 16 }}
      />

      <label>Cleanliness Level: {prefs.cleanlinessLevel}/5</label>
      <input
        type="range" min={1} max={5}
        value={prefs.cleanlinessLevel}
        onChange={(e) => setPrefs({ ...prefs, cleanlinessLevel: Number(e.target.value) })}
        style={{ display: 'block', width: '100%', marginBottom: 16 }}
      />

      <label>
        <input
          type="checkbox"
          checked={prefs.hasPets}
          onChange={(e) => setPrefs({ ...prefs, hasPets: e.target.checked })}
        />
        {' '}I have pets
      </label>

      <br /><br />
      <button onClick={handleSave} style={{ padding: '10px 24px', fontSize: 16 }}>
        Save Preferences
      </button>
      {saved && <span style={{ color: 'green', marginLeft: 12 }}>✓ Saved!</span>}
    </div>
  );
};

export default ProfilePage;