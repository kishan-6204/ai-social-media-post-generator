# AI Social Media Post Generator (Phase-2 MVP)

Phase-2 upgrades the original MVP with stronger backend validation, cleaner error handling, regenerate support, and a polished responsive UI with loading states, notifications, history, and copy-to-clipboard.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **AI Provider:** Google Gemini 2.5 Flash via REST API

## Project Structure

```txt
.
├── backend/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Local Setup

### 1) Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=5000
```

Run backend:

```bash
npm run dev
```

Backend default URL: `http://localhost:5000`

### 2) Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
```

Optional env override:

```bash
echo 'VITE_API_BASE_URL=http://localhost:5000' > .env
```

Run frontend:

```bash
npm run dev
```

Frontend default URL: `http://localhost:5173`

## API Endpoints

### `POST /generate`

Generates a social media post and updates session history.

Request body:

```json
{
  "topic": "Launching my design newsletter",
  "platform": "LinkedIn",
  "tone": "Professional",
  "regenerate": false
}
```

Successful response:

```json
{
  "text": "...generated social post...",
  "history": []
}
```

Validation and upstream failures return clear JSON:

```json
{
  "error": "ValidationError",
  "message": "Topic is required and should be at least 3 characters long."
}
```

### `GET /history`

Returns last 5 generated posts for current server session:

```json
{
  "history": []
}
```

## Phase-2 Feature Summary

### Backend

- Input sanitization and field validation for `topic`, `platform`, and `tone`.
- Structured JSON error responses.
- Graceful Gemini rate-limit handling (`429`).
- Regenerate support via `regenerate` flag.
- In-memory history storage (last 5 per server session).
- Centralized Express error middleware.

### Frontend

- Loading indicator and disabled button state while requests are in flight.
- Clean inline + notification-based error display.
- Working copy-to-clipboard action.
- Separate regenerate button after first generation.
- History panel showing last 5 generated posts.
- Responsive card-based layout for mobile + desktop.
- Improved focus styles, spacing, and accessible labels.
- Optional light/dark theme toggle.

## Security Note

- Keep API keys on backend only.
- Never commit `.env` files.
