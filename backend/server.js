import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Uses Node.js built-in fetch in runtime.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_HISTORY_ITEMS = 5;
const ALLOWED_PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter/X'];
const ALLOWED_TONES = ['Professional', 'Casual', 'Motivational'];

// In-memory history for the current server session.
const generationHistory = [];

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY is not set. API requests will fail until it is configured.');
}

app.use(cors());
app.use(express.json());

const sanitizeValue = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const validateGenerateRequest = (payload) => {
  const topic = sanitizeValue(payload?.topic);
  const platform = sanitizeValue(payload?.platform);
  const tone = sanitizeValue(payload?.tone);
  const regenerate = Boolean(payload?.regenerate);

  if (!topic || topic.length < 3) {
    return { error: 'Topic is required and should be at least 3 characters long.' };
  }

  if (!ALLOWED_PLATFORMS.includes(platform)) {
    return { error: `Platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}.` };
  }

  if (!ALLOWED_TONES.includes(tone)) {
    return { error: `Tone must be one of: ${ALLOWED_TONES.join(', ')}.` };
  }

  return {
    topic,
    platform,
    tone,
    regenerate
  };
};

const buildPrompt = ({ topic, platform, tone, regenerate }) => `
You are an expert social media copywriter.
Generate one high-quality ${platform} post using the information below.

Inputs:
- Topic: ${topic}
- Platform: ${platform}
- Tone: ${tone}
- Regenerate request: ${regenerate ? 'Yes. Return a fresh variation from previous attempts.' : 'No'}

Requirements:
1) Match the requested tone naturally.
2) Optimize style for ${platform} best practices.
3) Keep it concise and engaging for a beginner creator audience.
4) Include 1 strong hook in first line.
5) Add a clear call-to-action in final line.
6) Include relevant emojis sparingly.
7) Include 3 to 5 relevant hashtags at the end.

Output format:
- Return only the post text.
- Do not include titles, labels, or explanations.
`;

const saveToHistory = (entry) => {
  generationHistory.unshift(entry);
  if (generationHistory.length > MAX_HISTORY_ITEMS) {
    generationHistory.pop();
  }
};

app.post('/generate', async (req, res, next) => {
  const validated = validateGenerateRequest(req.body);

  if (validated.error) {
    return res.status(400).json({
      error: 'ValidationError',
      message: validated.error
    });
  }

  const { topic, platform, tone, regenerate } = validated;

  try {
    const prompt = buildPrompt({ topic, platform, tone, regenerate });
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const apiMessage = payload?.error?.message || 'Gemini API request failed.';
      const isRateLimit = geminiResponse.status === 429;
      return res.status(isRateLimit ? 429 : 502).json({
        error: isRateLimit ? 'RateLimitExceeded' : 'UpstreamError',
        message: isRateLimit
          ? 'Gemini rate limit reached. Please wait a moment and try again.'
          : `Gemini request failed: ${apiMessage}`
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return res.status(502).json({
        error: 'UpstreamError',
        message: 'Gemini returned an empty response. Please retry with a clearer topic.'
      });
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      platform,
      tone,
      text,
      regenerate,
      createdAt: new Date().toISOString()
    };

    saveToHistory(entry);

    return res.json({ text, history: generationHistory });
  } catch (error) {
    return next(error);
  }
});

app.get('/history', (_req, res) => {
  res.json({ history: generationHistory });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Centralized error handling middleware.
app.use((error, _req, res, _next) => {
  console.error('Unhandled backend error:', error);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong on the server. Please try again shortly.'
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
