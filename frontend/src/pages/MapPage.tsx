import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { authHeaders } from '../auth';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet marker icons in Vite
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
const defaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

interface Post {
  id: string;
  authorId?: string;
  authorName?: string;
  title: string;
  location: string;
  budget: number;
  roomType: string;
  moveInDate: string;
  noiseLevel: number;
  cleanLevel: number;
  lat?: number;
  lng?: number;
  matchScore?: number;
  isSublet?: boolean;
}

export default function MapPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filters, setFilters] = useState({ maxBudget: '', roomType: '' });
  const [pendingFilters, setPendingFilters] = useState({ maxBudget: '', roomType: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.maxBudget) params.set('budget', filters.maxBudget);
    if (filters.roomType) params.set('roomType', filters.roomType);

    fetch(`/api/posts?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const mappable = posts.filter(p => p.lat !== undefined && p.lng !== undefined);

  return (
    <div className="map-page">
      <div className="map-header">
        <h1>Map View</h1>
        <p className="subtitle">
          {mappable.length} listing{mappable.length !== 1 ? 's' : ''} with locations shown
          {posts.length > mappable.length && ` (${posts.length - mappable.length} without coordinates)`}
        </p>
      </div>

      <div className="map-layout">
        <aside className="filter-panel">
          <h2>Filters</h2>
          <div className="form-group">
            <label>Max Budget ($/mo)</label>
            <input
              type="number"
              placeholder="e.g. 900"
              value={pendingFilters.maxBudget}
              onChange={e => setPendingFilters(f => ({ ...f, maxBudget: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && setFilters(pendingFilters)}
            />
          </div>
          <div className="form-group">
            <label>Room Type</label>
            <select
              value={pendingFilters.roomType}
              onChange={e => setPendingFilters(f => ({ ...f, roomType: e.target.value }))}
            >
              <option value="">Any</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Suite">Suite</option>
              <option value="Studio">Studio</option>
            </select>
          </div>
          <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setFilters(pendingFilters)}>
            Apply
          </button>

          <div style={{ marginTop: '1.5rem' }}>
            <h2>Listings</h2>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {loading ? (
                <p className="loading" style={{ padding: '1rem 0' }}>Loading…</p>
              ) : posts.length === 0 ? (
                <p className="loading" style={{ padding: '1rem 0' }}>No listings found.</p>
              ) : (
                posts.map(post => (
                  <div key={post.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #c8d0dc' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a2e' }}>{post.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                      ${post.budget}/mo · {post.roomType}
                      {!post.lat && ' · no pin'}
                    </div>
                    {post.authorId && (
                      <Link to={`/users/${post.authorId}`} style={{ fontSize: '0.78rem', color: '#2952d9' }}>
                        View profile →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="map-container">
          <MapContainer
            center={[42.3601, -71.0589]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappable.map(post => (
              <Marker key={post.id} position={[post.lat!, post.lng!]}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{post.title}</strong>
                    <div style={{ fontSize: '0.85rem', marginTop: 4, color: '#4a5568' }}>
                      {post.location}<br />
                      ${post.budget}/mo · {post.roomType}<br />
                      Move-in: {post.moveInDate}
                    </div>
                    {post.matchScore !== undefined && (
                      <div style={{ marginTop: 6, color: '#2952d9', fontWeight: 700 }}>
                        Match: {post.matchScore}%
                      </div>
                    )}
                    {post.authorId && (
                      <Link to={`/users/${post.authorId}`} style={{ display: 'block', marginTop: 6, color: '#2952d9', fontSize: '0.85rem' }}>
                        View profile →
                      </Link>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
