import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY is not set. API requests will fail until it is configured.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.use(cors());
app.use(express.json());

const buildPrompt = ({ topic, platform, tone }) => `
You are an expert social media copywriter.
Generate one high-quality ${platform} post using the information below.

Inputs:
- Topic: ${topic}
- Platform: ${platform}
- Tone: ${tone}

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

app.post('/generate', async (req, res) => {
  const { topic, platform, tone } = req.body;

  if (!topic || !platform || !tone) {
    return res.status(400).json({
      error: 'Missing required fields: topic, platform, and tone are all required.'
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = buildPrompt({ topic, platform, tone });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return res.json({ text });
  } catch (error) {
    console.error('Gemini generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate content. Please try again.'
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
