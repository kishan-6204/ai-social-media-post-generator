import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { sanitizeValue } from '../utils/helpers.js';
import {
  ALLOWED_LANGUAGES,
  ALLOWED_PLATFORMS,
  ALLOWED_TONES,
  FREE_TIER_DAILY_LIMIT,
  REFINEMENTS
} from '../config/constants.js';
import { analyzePostQuality, generateWithCache } from '../services/geminiService.js';
import {
  enforceCooldown,
  enforceDailyLimit,
  getDashboard,
  getHistory,
  getOrCreateUser,
  incrementUsage,
  saveHistory,
  upsertProfile
} from '../services/userService.js';
import { enforceGuestLimit, incrementGuestUsage } from '../services/guestService.js';

const router = Router();

const buildPrompt = ({ topic, platform, tone, language, brandProfile, refinement }) => `
Create one ${language} social media post.
Platform: ${platform}
Tone: ${tone}
Topic: ${topic}
Refinement: ${refinement || 'None'}
Brand context:
- Display Name: ${brandProfile?.displayName || 'N/A'}
- Bio: ${brandProfile?.bio || 'N/A'}
- Writing Style: ${brandProfile?.writingStyle || 'N/A'}
- Target Audience: ${brandProfile?.targetAudience || 'N/A'}
Rules: concise, strong hook, CTA, 3-5 hashtags, return only final post text.
`;

const validateInput = ({ topic, platform, tone, language }) => {
  if (sanitizeValue(topic).length < 3) throw new ApiError(400, 'ValidationError', 'Topic must be at least 3 chars.');
  if (!ALLOWED_PLATFORMS.includes(platform)) throw new ApiError(400, 'ValidationError', 'Invalid platform.');
  if (!ALLOWED_TONES.includes(tone)) throw new ApiError(400, 'ValidationError', 'Invalid tone.');
  if (!ALLOWED_LANGUAGES.includes(language)) throw new ApiError(400, 'ValidationError', 'Invalid language.');
};

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const isGuest = !req.headers.authorization;
    const topic = sanitizeValue(req.body.topic);
    const platform = sanitizeValue(req.body.platform);
    const tone = sanitizeValue(req.body.tone);
    const language = sanitizeValue(req.body.language || 'English');

    validateInput({ topic, platform, tone, language });

    if (isGuest) {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      enforceGuestLimit(ip);
      const prompt = buildPrompt({ topic, platform, tone, language, brandProfile: {} });
      const generated = await generateWithCache({ uid: `guest:${ip}`, prompt });
      const quality = await analyzePostQuality({ post: generated.text, language });
      incrementGuestUsage(ip);
      return res.json({
        text: generated.text,
        quality,
        usage: { dailyGenerations: 1, limit: 1, isGuest: true },
        requiresLogin: true
      });
    }

    await requireAuth(req, res, () => {});
    const userData = await getOrCreateUser(req.user);
    enforceCooldown(userData);
    enforceDailyLimit(userData);

    const prompt = buildPrompt({ topic, platform, tone, language, brandProfile: userData.brandProfile || {} });
    const generated = await generateWithCache({ uid: req.user.uid, prompt });
    const quality = await analyzePostQuality({ post: generated.text, language });

    await incrementUsage(req.user.uid);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      platform,
      tone,
      language,
      text: generated.text,
      quality,
      createdAt: new Date().toISOString()
    };
    await saveHistory(req.user.uid, entry);

    const updatedUser = await getOrCreateUser(req.user);
    return res.json({
      text: generated.text,
      quality,
      usage: { dailyGenerations: updatedUser.dailyGenerations, limit: FREE_TIER_DAILY_LIMIT, isGuest: false },
      estimatedTokens: generated.estimatedTokens,
      cached: generated.cached
    });
  })
);

router.post(
  '/refine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const refinement = sanitizeValue(req.body.refinement);
    if (!REFINEMENTS.includes(refinement)) throw new ApiError(400, 'ValidationError', 'Invalid refinement type.');

    const topic = sanitizeValue(req.body.topic);
    const platform = sanitizeValue(req.body.platform);
    const tone = sanitizeValue(req.body.tone);
    const language = sanitizeValue(req.body.language || 'English');
    validateInput({ topic, platform, tone, language });

    const userData = await getOrCreateUser(req.user);
    enforceCooldown(userData);
    enforceDailyLimit(userData);

    const prompt = buildPrompt({ topic, platform, tone, language, brandProfile: userData.brandProfile || {}, refinement });
    const generated = await generateWithCache({ uid: req.user.uid, prompt });
    const quality = await analyzePostQuality({ post: generated.text, language });

    await incrementUsage(req.user.uid);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      platform,
      tone,
      language,
      text: generated.text,
      refinement,
      quality,
      createdAt: new Date().toISOString()
    };
    await saveHistory(req.user.uid, entry);

    const updatedUser = await getOrCreateUser(req.user);
    res.json({ text: generated.text, quality, usage: { dailyGenerations: updatedUser.dailyGenerations, limit: FREE_TIER_DAILY_LIMIT } });
  })
);

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const items = await getHistory(req.user.uid, req.query);
  res.json({ history: items });
}));

router.post('/profile', requireAuth, asyncHandler(async (req, res) => {
  const profile = {
    displayName: sanitizeValue(req.body.displayName),
    bio: sanitizeValue(req.body.bio),
    writingStyle: sanitizeValue(req.body.writingStyle),
    targetAudience: sanitizeValue(req.body.targetAudience)
  };
  await upsertProfile(req.user.uid, profile);
  res.json({ success: true, profile });
}));

router.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const dashboard = await getDashboard(req.user.uid);
  res.json(dashboard);
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await getOrCreateUser(req.user);
  res.json({ user });
}));

export default router;
