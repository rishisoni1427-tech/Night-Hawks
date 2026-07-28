# Night Hawks — Discord Community Site

A full copy-paste-ready clone: glassmorphic dark/purple frontend + a small Express backend that serves live JSON data to it.

## Structure
```
nighthawks/
├── server.js          # Express backend + API routes
├── package.json
└── public/
    ├── index.html      # Page markup
    ├── style.css       # Glass theme (all sections share the same .glass style)
    └── script.js       # Fetches data from the backend and renders it
```

## Run it
```bash
npm install
npm start
```
Then open **http://localhost:3000**

## API endpoints (the backend)
| Route | Returns |
|---|---|
| `GET /api/stats` | members online, total members, voice channels, uptime, trend data |
| `GET /api/events` | upcoming events list |
| `GET /api/activity` | server activity feed |
| `GET /api/members/top` | leaderboard |
| `GET /api/announcements` | announcements |

All data lives in-memory in `server.js` (the `serverStats`, `events`, `activity`, `topMembers`, `announcements` arrays/objects) — edit those directly to change what shows up, or swap them for real database calls later.

## Customizing
- **Colors/theme**: all in the `:root` block at the top of `style.css` (`--purple-1`, `--bg`, etc.)
- **Glass effect**: the `.glass` class controls blur/border/opacity — every card, nav, and panel reuses it, so changing it once updates the whole site.
- **Content**: edit the arrays in `server.js` — the frontend re-renders automatically from whatever the API returns.
- **Hero artwork**: drop an image at `public/hawk.svg` (or `.png`) — it's already wired up in `index.html`.
