import { GUEST_LIMIT } from '../config/constants.js';
import { ApiError } from '../utils/errors.js';
import { today } from '../utils/helpers.js';

const guestUsageByIp = new Map();

export const enforceGuestLimit = (ip) => {
  const key = `${ip}:${today()}`;
  const used = guestUsageByIp.get(key) || 0;
  if (used >= GUEST_LIMIT) {
    throw new ApiError(429, 'GuestLimitExceeded', 'Guest limit reached. Sign in to continue.');
  }
};

export const incrementGuestUsage = (ip) => {
  const key = `${ip}:${today()}`;
  guestUsageByIp.set(key, (guestUsageByIp.get(key) || 0) + 1);
};
