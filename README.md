# AI Social Media Post Generator (Phase-1 MVP)

A clean, modern MVP web app that generates social media post text using **Google Gemini**.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** `@google/generative-ai` using `gemini-pro`

## Project Structure

```txt
.
├── backend/
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   └── main.jsx
    ├── tailwind.config.js
    └── package.json
```

## 1) Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=5000
```

Run backend:

```bash
npm run dev
```

Backend runs at `http://localhost:5000`.

## 2) Setup Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Optional API base URL override:

```bash
echo 'VITE_API_BASE_URL=http://localhost:5000' > .env
```

Run frontend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API

### `POST /generate`

Request body:

```json
{
  "topic": "Launching my design newsletter",
  "platform": "LinkedIn",
  "tone": "Professional"
}
```

Response:

```json
{
  "text": "...generated social post..."
}
```

## Notes

- API key stays on backend only (never exposed to frontend).
- MVP includes Generate, Regenerate, and Copy actions.
