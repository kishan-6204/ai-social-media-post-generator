# AI Social Media Post Generator — Phase 3 SaaS

Production-oriented upgrade of the MVP with authentication, usage controls, persistent data, personalization, analytics, and cost protection.

## Phase-3 Features Implemented

- Firebase Authentication (Email/Password + Google) on frontend.
- Firebase Admin JWT verification on backend for protected endpoints.
- Guest mode: exactly **1** generation (IP-enforced server-side + `localStorage` UI lock).
- Free tier: **10 generations/day**, refinements included.
- Automatic daily reset via `lastResetDate` check.
- Strict 429 structured errors for quota and cooldown violations.
- 10-second cooldown enforced by backend and reflected in UI.
- Firestore persistence for users, profile, and last 20 history entries.
- Personal brand profile injected into generation prompts.
- Post quality analyzer (second Gemini call).
- Refinement endpoint and UI actions.
- Multilingual selection (English/Hindi).
- Dashboard endpoint and frontend summary analytics.
- Cost protection: token cap, retry policy (max 2 retries), prompt cache, express-rate-limit, usage logging fields.

## Architecture

### Backend
- Stack: Node.js + Express + Firebase Admin + Firestore.
- Base API prefix: `/api`.

Routes:
- `POST /api/generate` (guest allowed once; auth users tracked)
- `POST /api/refine` (auth only)
- `GET /api/history` (auth only)
- `POST /api/profile` (auth only)
- `GET /api/dashboard` (auth only)
- `GET /api/me` (auth only)

### Frontend
- Stack: React + Vite + Tailwind.
- Includes login/register views, Google Sign-In, usage counter, cooldown timer, quality panel, profile form, dashboard metrics, and history view.

## Firestore Schema

### `users/{uid}`
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "dailyGenerations": 0,
  "totalGenerations": 0,
  "lastResetDate": "YYYY-MM-DD",
  "cooldownUntil": "ISO date | null",
  "brandProfile": {
    "displayName": "string",
    "bio": "string",
    "writingStyle": "string",
    "targetAudience": "string"
  }
}
```

### `users/{uid}/history/{postId}`
Stores up to last 20 entries with topic/platform/tone/language/text/quality/timestamps.

## Usage Enforcement Logic

- Guest path (`POST /api/generate` without auth header):
  - Validate payload.
  - Check IP usage map for current date.
  - If used >= 1, return `429 GuestLimitExceeded`.
- Auth path:
  - Verify Firebase token.
  - Ensure user doc exists.
  - Reset `dailyGenerations` when `lastResetDate !== today`.
  - If `dailyGenerations >= 10`, return:

```json
{
  "error": "DailyLimitExceeded",
  "message": "You have reached your 10 free daily generations."
}
```

- Cooldown middleware behavior:
  - If `cooldownUntil > now`, return 429 with remaining seconds.

## Cost Protection Strategy

- `maxOutputTokens` set for Gemini calls.
- Retry wrapper: 1 initial call + up to 2 retries.
- Prompt cache (per user + prompt hash, 5 min TTL).
- `express-rate-limit` on `/api/*`.
- Input sanitization and strict allowlists.
- Structured error responses for consistent client handling.

## Firebase Setup

### 1) Create Firebase project
- Enable Authentication providers:
  - Email/Password
  - Google
- Enable Firestore Database.

### 2) Frontend `.env`
```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3) Backend `.env`
```bash
PORT=5000
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Run

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Middleware Examples

- Auth middleware: verifies Firebase JWT, attaches `req.user`.
- Error middleware: unified structured JSON errors.
- Cooldown/limit checks: executed before generation/refinement calls.

## Notes

- Frontend tracks `guestUsed` in localStorage for UX login wall.
- Backend remains source of truth for all limits and abuse prevention.
- Refinements increment daily counters only on success.
