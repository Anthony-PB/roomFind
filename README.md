# RoomFind

A roommate-finding web application for college students. Users create listings, set lifestyle preferences, get match scores against other listings, message potential roommates, and view available housing on an interactive map.

---

## Features

- **Match Scoring** — Server computes a 0–100 compatibility score per listing based on noise tolerance, cleanliness, and sleep schedule. Browse is sorted by score when logged in.
- **Listings** — Post a room or sublet with budget, room type, move-in date, living style, and optional map coordinates.
- **Filters & Sort** — Filter by max budget and room type; sort by match score, budget, or date.
- **Bookmarks** — Save listings to a personal "Saved" tab.
- **Roommate Requests** — Send a request to a poster, accept or decline incoming requests.
- **Direct Messages** — Real-time-style chat with any user (polls every 4 s).
- **Map View** — OpenStreetMap/Leaflet map showing pins for listings that include coordinates.
- **User Profiles** — View another user's lifestyle preferences and listings; send a message or request from their profile.
- **Sublet Support** — Mark a listing as a sublet with an availability date range.
- **.edu Restriction** — Registration requires a university `.edu` email address.

---

## Project Structure

```
roomFind/
├── frontend/          # React + TypeScript + Vite
│   └── src/
│       ├── pages/     # BrowsePage, CreatePostPage, ProfilePage,
│       │              # UserProfilePage, MessagesPage, RequestsPage, MapPage,
│       │              # LoginPage, RegisterPage
│       ├── components/# Navbar
│       └── auth.ts    # JWT helpers (localStorage)
└── server/            # Node + Express + TypeScript + Firestore
    └── src/
        ├── routes/    # auth, posts, users, bookmarks, requests, messages
        ├── middleware/ # requireAuth (JWT)
        └── firebase.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled
- A service account key JSON from Firebase Console

### 1. Server setup

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=3001
JWT_SECRET=your_secret_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
```

Start the server:

```bash
npm run dev
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:3001`.

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register (`.edu` email required) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/posts` | optional | List posts; computes match score if authenticated. Query: `budget`, `roomType`, `sort` |
| POST | `/api/posts` | ✓ | Create a listing |
| PUT | `/api/posts/:id` | ✓ | Update own listing |
| DELETE | `/api/posts/:id` | ✓ | Delete own listing |
| GET | `/api/users/me` | ✓ | Get own profile + preferences |
| PUT | `/api/users/me` | ✓ | Save preferences |
| DELETE | `/api/users/me` | ✓ | Delete account (cascades posts) |
| GET | `/api/users/:id` | ✓ | Get another user's profile |
| GET | `/api/bookmarks` | ✓ | List bookmarked posts |
| GET | `/api/bookmarks/ids` | ✓ | List bookmarked post IDs |
| POST | `/api/bookmarks/:postId` | ✓ | Bookmark a post |
| DELETE | `/api/bookmarks/:postId` | ✓ | Remove bookmark |
| GET | `/api/requests` | ✓ | Get sent + received requests |
| POST | `/api/requests` | ✓ | Send a roommate request |
| PATCH | `/api/requests/:id` | ✓ | Accept or decline a request |
| GET | `/api/messages` | ✓ | List conversations |
| GET | `/api/messages/:userId` | ✓ | Get thread with a user |
| POST | `/api/messages/:userId` | ✓ | Send a message |

---

## Match Score Algorithm

When a logged-in user with saved preferences fetches posts, each post receives a score:

| Factor | Weight |
|--------|--------|
| Noise level similarity | 40 pts |
| Cleanliness similarity | 40 pts |
| Sleep schedule match | 20 pts |

Noise and cleanliness are rated 1–5; the score for each is `(1 − |diff| / 4) × weight`. Sleep schedule is exact match (20 pts), adjacent (10 pts), or opposite (0 pts). Posts are returned sorted by score descending.
