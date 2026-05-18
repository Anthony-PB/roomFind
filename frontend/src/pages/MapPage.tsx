import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link, useSearchParams } from 'react-router-dom';
import { authHeaders, getUser } from '../auth';
import { apiFetch } from '../api';
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

const ITHACA: [number, number] = [42.4440, -76.5021];

function MapController({ selected, posts }: { selected: Set<string>; posts: Post[] }) {
  const map = useMap();
  useEffect(() => {
    if (selected.size === 1) {
      const [id] = selected;
      const post = posts.find(p => p.id === id);
      if (post?.lat && post?.lng) {
        map.flyTo([post.lat, post.lng], 16, { duration: 0.7 });
      }
    } else if (selected.size === 0) {
      map.flyTo(ITHACA, 14, { duration: 0.7 });
    }
  }, [selected]);
  return null;
}

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filters, setFilters] = useState({ maxBudget: '', roomType: '', isSublet: false });
  const [pendingFilters, setPendingFilters] = useState({ maxBudget: '', roomType: '', isSublet: false });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const h = searchParams.get('highlight');
    return h ? new Set([h]) : new Set();
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const user = getUser();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.maxBudget) params.set('budget', filters.maxBudget);
    if (filters.roomType) params.set('roomType', filters.roomType);
    if (filters.isSublet) params.set('isSublet', 'true');

    apiFetch(`/api/posts?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/bookmarks/ids', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { ids: string[] }) => setBookmarkedIds(new Set(data.ids ?? [])))
      .catch(() => {});
  }, []);

  const mappable = posts.filter(p => p.lat !== undefined && p.lng !== undefined);
  const visibleMarkers = selected.size > 0 ? mappable.filter(p => selected.has(p.id)) : mappable;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    setTogglingId(postId);
    const isBookmarked = bookmarkedIds.has(postId);
    try {
      const res = await apiFetch(`/api/bookmarks/${postId}`, {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 409) {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          isBookmarked ? next.delete(postId) : next.add(postId);
          return next;
        });
      }
    } finally {
      setTogglingId(null);
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="map-page">
      <div className="map-header">
        <h1>Map View</h1>
        <p className="subtitle">
          {selectedCount > 0
            ? `Showing ${selectedCount} selected pin${selectedCount !== 1 ? 's' : ''} — uncheck to show all`
            : `${mappable.length} listing${mappable.length !== 1 ? 's' : ''} with locations shown${posts.length > mappable.length ? ` (${posts.length - mappable.length} without pin)` : ''}`
          }
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
          <label className="filter-check-label" style={{ marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              checked={pendingFilters.isSublet}
              onChange={e => setPendingFilters(f => ({ ...f, isSublet: e.target.checked }))}
              style={{ width: 'auto', marginRight: '0.4rem', accentColor: '#2952d9' }}
            />
            Sublets only
          </label>
          <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => setFilters(pendingFilters)}>
            Apply
          </button>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h2 style={{ margin: 0 }}>Listings</h2>
              {selectedCount > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  style={{ background: 'none', border: 'none', color: '#2952d9', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Clear selection
                </button>
              )}
            </div>
            <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
              {loading ? (
                <p className="loading" style={{ padding: '1rem 0' }}>Loading…</p>
              ) : posts.length === 0 ? (
                <p className="loading" style={{ padding: '1rem 0' }}>No listings found.</p>
              ) : (
                posts.map(post => {
                  const isChecked = selected.has(post.id);
                  const isSaved = bookmarkedIds.has(post.id);
                  return (
                    <div
                      key={post.id}
                      className={`map-listing-item${isChecked ? ' map-listing-item--checked' : ''}`}
                    >
                      <label className="map-listing-check">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(post.id)}
                          disabled={!post.lat}
                          title={!post.lat ? 'No map pin for this listing' : undefined}
                        />
                      </label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#4a5568' }}>
                          ${post.budget}/mo · {post.roomType}
                          {!post.lat && <span style={{ color: '#a0aec0' }}> · no pin</span>}
                        </div>
                        {post.authorId && (
                          <Link to={`/users/${post.authorId}`} style={{ fontSize: '0.75rem', color: '#2952d9' }}>
                            View profile →
                          </Link>
                        )}
                      </div>
                      {user && (
                        <button
                          className={`btn-bookmark${isSaved ? ' saved' : ''}`}
                          style={{ fontSize: '1.1rem', flexShrink: 0 }}
                          onClick={() => toggleBookmark(post.id)}
                          disabled={togglingId === post.id}
                          title={isSaved ? 'Remove bookmark' : 'Save'}
                        >
                          {isSaved ? '♥' : '♡'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="map-container">
          <MapContainer
            center={ITHACA}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController selected={selected} posts={posts} />
            {visibleMarkers.map(post => (
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
