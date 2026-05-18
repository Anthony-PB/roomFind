# RoomFind

A roommate-finding web application for Cornell students. Users create listings, set lifestyle preferences, get match scores against other listings, message potential roommates, and view available housing on an interactive map centered on Ithaca, NY.

**Live app:** [https://your-app.vercel.app](https://your-app.vercel.app)

---

## Features

- **Match Scoring** — Server computes a 0–100 compatibility score per listing based on noise tolerance, cleanliness, and sleep schedule. Browse is sorted by score when logged in.
- **Listings** — Post a room or sublet with budget, room type, move-in date, living style, and address autocomplete (Nominatim/OpenStreetMap).
- **Filters, Sort & Search** — Filter by max budget, room type, and sublet; sort by match score, budget, or date; full-text search across titles and descriptions.
- **Bookmarks** — Save listings to a personal "Saved" tab.
- **Roommate Requests** — Send a request directly from a listing card, accept or decline incoming requests, dismiss old ones.
- **Direct Messages** — Chat with any user (polls every 4 s).
- **Map View** — OpenStreetMap/Leaflet map with pin filtering, sidebar bookmarks, and highlight-from-browse linking.
- **User Profiles** — View lifestyle preferences, listings, and social links (Instagram, LinkedIn).
- **Notifications** — Bell icon in the navbar shows pending requests and accepted requests.
- **My Listings** — Dedicated tab to manage, edit, and delete your own posts.
- **Sublet Support** — Mark a listing as a sublet with an availability date range.
- **.edu Restriction** — Registration requires a university `.edu` email address.

---

## Project Structure

```
roomFind/
├── frontend/          # React + TypeScript + Vite
│   └── src/
│       ├── pages/     # BrowsePage, CreatePostPage, EditPostPage, ProfilePage,
│       │              # UserProfilePage, MessagesPage, RequestsPage, MapPage,
│       │              # LoginPage, RegisterPage
│       ├── components/# Navbar
│       ├── api.ts     # apiFetch wrapper (uses VITE_API_URL in production)
│       └── auth.ts    # JWT helpers (localStorage)
└── server/            # Node + Express + TypeScript + Firestore
    └── src/
        ├── routes/    # auth, posts, users, bookmarks, requests, messages
        ├── middleware/ # requireAuth (JWT)
        └── firebase.ts
```

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register (`.edu` email required) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/posts` | optional | List posts; computes match score if authenticated. Query: `budget`, `roomType`, `isSublet`, `sort` |
| POST | `/api/posts` | ✓ | Create a listing |
| PUT | `/api/posts/:id` | ✓ | Update own listing |
| DELETE | `/api/posts/:id` | ✓ | Delete own listing |
| GET | `/api/users/me` | ✓ | Get own profile + preferences |
| PUT | `/api/users/me` | ✓ | Save preferences, instagram, linkedin |
| DELETE | `/api/users/me` | ✓ | Delete account (cascades posts) |
| GET | `/api/users/:id` | ✓ | Get another user's profile |
| GET | `/api/bookmarks` | ✓ | List bookmarked posts |
| GET | `/api/bookmarks/ids` | ✓ | List bookmarked post IDs |
| POST | `/api/bookmarks/:postId` | ✓ | Bookmark a post |
| DELETE | `/api/bookmarks/:postId` | ✓ | Remove bookmark |
| GET | `/api/requests` | ✓ | Get sent + received requests |
| POST | `/api/requests` | ✓ | Send a roommate request |
| PATCH | `/api/requests/:id` | ✓ | Accept or decline a request |
| DELETE | `/api/requests/:id` | ✓ | Dismiss or cancel a request |
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
