import { getFirestore } from '../config/firebaseAdmin.js';
import { FREE_TIER_DAILY_LIMIT, MAX_HISTORY_ITEMS } from '../config/constants.js';
import { ApiError } from '../utils/errors.js';
import { today } from '../utils/helpers.js';

const defaultBrandProfile = {
  displayName: '',
  bio: '',
  writingStyle: '',
  targetAudience: ''
};

export const getOrCreateUser = async (user) => {
  const db = getFirestore();
  const ref = db.collection('users').doc(user.uid);
  const doc = await ref.get();

  if (!doc.exists) {
    const fresh = {
      uid: user.uid,
      name: user.name || user.displayName || '',
      email: user.email || '',
      dailyGenerations: 0,
      totalGenerations: 0,
      lastResetDate: today(),
      brandProfile: defaultBrandProfile,
      cooldownUntil: null,
      createdAt: new Date().toISOString()
    };
    await ref.set(fresh);
    return fresh;
  }

  const data = doc.data();
  if (data.lastResetDate !== today()) {
    await ref.update({ dailyGenerations: 0, lastResetDate: today() });
    data.dailyGenerations = 0;
    data.lastResetDate = today();
  }

  return data;
};

export const enforceDailyLimit = (userData) => {
  if (userData.dailyGenerations >= FREE_TIER_DAILY_LIMIT) {
    throw new ApiError(429, 'DailyLimitExceeded', 'You have reached your 10 free daily generations.');
  }
};

export const enforceCooldown = (userData) => {
  if (!userData.cooldownUntil) return;
  const now = Date.now();
  const until = new Date(userData.cooldownUntil).getTime();
  if (until > now) {
    throw new ApiError(429, 'CooldownActive', `Please wait ${Math.ceil((until - now) / 1000)}s before your next generation.`);
  }
};

export const incrementUsage = async (uid) => {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'UserNotFound', 'User record missing.');
    const data = snap.data();
    const reset = data.lastResetDate !== today();
    const daily = reset ? 0 : data.dailyGenerations || 0;

    if (daily >= FREE_TIER_DAILY_LIMIT) {
      throw new ApiError(429, 'DailyLimitExceeded', 'You have reached your 10 free daily generations.');
    }

    tx.update(ref, {
      dailyGenerations: daily + 1,
      totalGenerations: (data.totalGenerations || 0) + 1,
      lastResetDate: today(),
      cooldownUntil: new Date(Date.now() + 10000).toISOString()
    });
  });
};

export const saveHistory = async (uid, entry) => {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('history').doc(entry.id);
  await ref.set(entry);

  const all = await db.collection('users').doc(uid).collection('history').orderBy('createdAt', 'desc').get();
  if (all.size > MAX_HISTORY_ITEMS) {
    const over = all.docs.slice(MAX_HISTORY_ITEMS);
    await Promise.all(over.map((d) => d.ref.delete()));
  }
};

export const getHistory = async (uid, { platform, tone, date }) => {
  const db = getFirestore();
  let query = db.collection('users').doc(uid).collection('history').orderBy('createdAt', 'desc').limit(MAX_HISTORY_ITEMS);
  const snap = await query.get();
  let items = snap.docs.map((d) => d.data());
  if (platform) items = items.filter((item) => item.platform === platform);
  if (tone) items = items.filter((item) => item.tone === tone);
  if (date) items = items.filter((item) => item.createdAt?.slice(0, 10) === date);
  return items;
};

export const upsertProfile = async (uid, profile) => {
  const db = getFirestore();
  await db.collection('users').doc(uid).set({ brandProfile: profile }, { merge: true });
};

export const getDashboard = async (uid) => {
  const db = getFirestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new ApiError(404, 'UserNotFound', 'User not found.');
  const user = userSnap.data();
  const history = await getHistory(uid, {});

  const totalPosts = user.totalGenerations || 0;
  const dailyUsage = user.dailyGenerations || 0;

  const counts = history.reduce(
    (acc, item) => {
      acc.platform[item.platform] = (acc.platform[item.platform] || 0) + 1;
      acc.tone[item.tone] = (acc.tone[item.tone] || 0) + 1;
      return acc;
    },
    { platform: {}, tone: {} }
  );

  return {
    totalPosts,
    dailyUsage,
    limit: FREE_TIER_DAILY_LIMIT,
    mostUsedPlatform: Object.entries(counts.platform).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
    mostUsedTone: Object.entries(counts.tone).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
    platformBreakdown: counts.platform,
    toneBreakdown: counts.tone
  };
};
