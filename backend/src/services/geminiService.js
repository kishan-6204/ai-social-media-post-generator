import crypto from 'crypto';
import { GEMINI_API_URL, MAX_OUTPUT_TOKENS } from '../config/constants.js';
import { ApiError } from '../utils/errors.js';

const promptCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError(500, 'ConfigError', 'Missing GEMINI_API_KEY on server.');

  let attempts = 0;
  let lastError;
  while (attempts < 3) {
    attempts += 1;
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.8
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed');
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error('Gemini returned empty output.');
      return text;
    } catch (error) {
      lastError = error;
      if (attempts >= 3) break;
    }
  }

  throw new ApiError(502, 'UpstreamError', `Gemini failed after retries: ${lastError?.message || 'Unknown error'}`);
};

export const generateWithCache = async ({ uid, prompt }) => {
  const hash = crypto.createHash('sha256').update(`${uid}:${prompt}`).digest('hex');
  const now = Date.now();
  const cached = promptCache.get(hash);

  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    return { text: cached.text, cached: true, estimatedTokens: Math.ceil(prompt.length / 4) };
  }

  const text = await callGemini(prompt);
  promptCache.set(hash, { text, createdAt: now });
  return { text, cached: false, estimatedTokens: Math.ceil((prompt.length + text.length) / 4) };
};

export const analyzePostQuality = async ({ post, language }) => {
  const prompt = `Analyze this ${language} social post and return strict JSON with keys hookScore (0-10), clarityScore (0-10), engagementLevel (Low|Medium|High), suggestions (array of short strings). Post: ${post}`;
  const text = await callGemini(prompt);
  try {
    const normalized = text.replace(/```json|```/g, '').trim();
    return JSON.parse(normalized);
  } catch {
    return {
      hookScore: 7,
      clarityScore: 7,
      engagementLevel: 'Medium',
      suggestions: ['Add a stronger opening line.', 'Use one concrete example.', 'End with a clearer CTA.']
    };
  }
};
