<h1 align="center">✨ Fullstack Chat & Video Calling App ✨</h1>

![Demo App](/frontend/public/screenshot-for-readme.png)

<div align="center">
	<h1>Chatify</h1>
	<p><strong>Real‑time chat & video calling web app with onboarding, friend system, theming & Stream integration</strong></p>
	<img src="frontend/public/screenshot-for-readme.png" alt="Chatify Screenshot" width="850" />
	<br/>
	<br/>
	<p>
		<a href="https://chatify.pragyesh.tech" target="_blank">Live Demo</a> ·
		<a href="#-features">Features</a> ·
		<a href="#-quick-start">Quick Start</a> ·
		<a href="#-environment-variables">Env Vars</a> ·
		<a href="#-api-endpoints">API</a> ·
		<a href="#-architecture">Architecture</a> ·
		<a href="#-roadmap">Roadmap</a>
	</p>
</div>

---

## 🚀 Overview
Chatify is a full‑stack MERN application that lets authenticated users:
1. Sign up / log in (JWT HttpOnly cookie auth)
2. Complete onboarding (profile, languages, bio, location)
3. Discover recommended users & send friend requests
4. Accept requests and manage a friends list
5. Start 1:1 real‑time chats (Stream Chat)
6. Launch instant video calls (Stream Video SDK) directly from a chat
7. Persist user state & relationships in MongoDB
8. Enjoy theme customization (Zustand + DaisyUI/Tailwind)

Backend is deployed (Render) and frontend served via Vercel (custom domain allowed in CORS). Stream Chat & Video APIs power messaging & real‑time media.

## 🧩 Tech Stack
Frontend:
- React 19 + Vite 7
- Tailwind CSS 4 + DaisyUI component themes
- React Router v7
- TanStack Query (server state & caching)
- Zustand (lightweight client state)
- Stream Chat React & Stream Video React SDK
- Axios (API layer) & react-hot-toast (UX feedback)

Backend:
- Node.js (ESM) + Express 5
- MongoDB + Mongoose 8
- JWT (jsonwebtoken) for auth (HttpOnly cookie)
- bcryptjs for password hashing
- Stream Chat (server SDK) for user upsert + token issuing
- CORS, cookie-parser, dotenv

Dev/Deployment:
- Vercel (frontend), Render (backend) *(inferred from code)*
- Nodemon for backend dev

## ✨ Features
- Secure authentication (signup/login/logout) with validation
- Onboarding flow gating access to core app until profile completion
- Random avatar assignment on signup
- Friend system (send, accept requests, list friends, recommended users)
- Real‑time chat (1:1 channels deterministically keyed by user IDs)
- Video calling with auto generation & sharing of call URLs in chat
- Theming & persistence via localStorage
- Robust Axios instance with request/response interceptors & error logging
- Production‑aware CORS & cookie settings (SameSite, secure flags)
- Health check endpoint `/api/health`

## 🗂 Folder Structure (Top Level)
```
chatify/
	backend/
		src/
			controllers/      # Route handlers
			lib/              # DB & Stream helpers
			middleware/       # Auth guard
			models/           # Mongoose schemas
			routes/           # Express routers
			server.js         # App entry
	frontend/
		src/
			components/       # Reusable UI components
			pages/            # Route-level screens
			hooks/            # React Query + auth logic
			lib/              # API & axios abstraction
			store/            # Zustand store(s)
			constants/        # (language/theme constants etc.)
```

## 🔐 Authentication Flow
1. User signs up → password hashed (pre save hook) → JWT cookie set (7d) → Stream user upserted
2. Protected routes use `protectRoute` middleware → reads `jwt` cookie → verifies & attaches `req.user`
3. `GET /api/auth/me` returns current sanitized user (excludes password)

## 👥 Friend Request Lifecycle
1. `POST /api/users/friend-request/:id` creates a pending request (duplicate/self checks)
2. Recipient fetches pending via `GET /api/users/friend-requests`
3. `PUT /api/users/friend-request/:id/accept` marks accepted & performs reciprocal `$addToSet` friend updates
4. Friends listed via `GET /api/users/friends`

## 💬 Chat & 📹 Video
- Chat token: frontend calls `GET /api/chat/token` (protected) → server generates Stream token via secret
- Channel ID: sorted pair of user IDs → ensures idempotent 1:1 channel regardless of who initiates
- Video call: builds `/call/{channelId}` URL; message includes join link. Video client joins a `default` call with same ID.

## ⚙️ Environment Variables
Create `backend/.env`:
```
PORT=5000
MONGO_URI=YOUR_MONGODB_URI
JWT_SECRET_KEY=supersecret_jwt_key
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
NODE_ENV=development
```
Frontend `vite` variables (create `frontend/.env`):
```
VITE_STREAM_API_KEY=your_stream_api_key
```
Optional (deployment):
```
NODE_ENV=production
```
Notes:
- No frontend base URL var needed; axios selects by `import.meta.env.MODE`.
- Ensure production domain (`https://chatify.pragyesh.tech`) is whitelisted in CORS & Stream dashboard.

## 🏁 Quick Start
Clone & install:
```bash
git clone https://github.com/pragyesh7753/Chatify.git
cd Chatify

# Backend
cd backend
npm install
cp .env.example .env  # (create manually if example not present)

# Frontend
cd ../frontend
npm install
cp .env.example .env  # (create & add VITE_STREAM_API_KEY)
```
Run dev servers (two terminals):
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```
Open: http://localhost:5173

## 🔌 API Endpoints (Summary)
Auth:
- POST `/api/auth/signup`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET  `/api/auth/me`
- POST `/api/auth/onboarding`

Users (protected):
- GET  `/api/users` (recommended users)
- GET  `/api/users/friends`
- POST `/api/users/friend-request/:id`
- PUT  `/api/users/friend-request/:id/accept`
- GET  `/api/users/friend-requests` (incoming + accepted overview)
- GET  `/api/users/outgoing-friend-requests`

Chat (protected):
- GET `/api/chat/token`

Utility:
- GET `/api/health`

## 🧪 Testing
Currently no automated tests. Suggested next steps:
- Unit: controllers (auth, user, chat)
- Integration: friend request lifecycle
- E2E: Cypress for onboarding + chat flow

## 🛡 Security Considerations
- HttpOnly JWT cookie reduces XSS token theft
- Passwords hashed with bcrypt (salt rounds = 10)
- CORS restricts origins; consider adding rate limiting & helmet
- Stream tokens short‑lived on client side (issued per user via backend secret)

## 🏗 Architecture
```
┌────────────┐   JWT Cookie   ┌────────────┐   Stream Token   ┌──────────────┐
│  Browser   │ ─────────────▶ │  Express    │ ───────────────▶ │  Stream APIs  │
│  (React)   │ ◀───────────── │  (Backend)  │ ◀─────────────── │ (Chat/Video)  │
└─────┬──────┘                 └────┬───────┘                  └─────┬────────┘
			│  REST /api/*                │                                 │
			│                             │ Mongoose                        │
			▼                             ▼                                 ▼
	UI State / Query          MongoDB (Users, FriendRequests)     Real‑time Channels / Calls
```

## 📦 Deployment Notes
- Frontend build: `npm run build` (Vite) → deploy `dist/`
- Backend: Ensure `NODE_ENV=production`, correct CORS origins, and all env vars
- Add health check for Render uptime (already present)

## 🛠 Troubleshooting
| Issue | Possible Cause | Fix |
|-------|----------------|-----|
| CORS error | Unlisted origin | Add domain to allowedOrigins in `server.js` |
| 401 Unauthorized | Missing/expired JWT | Re-login; check cookie blocked by browser | 
| Stream token errors | Wrong API key/secret | Verify env vars match Stream dashboard |
| Chat/channel not loading | Channel watch failed | Check network tab & console for Stream errors |

## 🗺 Roadmap / Ideas
- Password reset & email verification
- User presence & typing indicators (Stream supports)
- Group channels & multi‑party calls
- Message search & attachments
- i18n for UI + language preferences
- Dark/light theme toggle within existing palette set
- Automated test suite & CI workflow

## 🤝 Contributing
1. Fork project & create feature branch
2. Keep commits atomic & descriptive
3. Open PR with context + before/after if UI changes

## 📄 License
Add an open source license (MIT recommended) in a `LICENSE` file.

## 🙌 Acknowledgements
- [Stream](https://getstream.io/) Chat & Video APIs
- Tailwind CSS + DaisyUI
- TanStack React Query team

## ✅ Status
Active development. Core 1:1 chat & video functional.

---
Made with ❤️ using the MERN stack & Stream APIs.