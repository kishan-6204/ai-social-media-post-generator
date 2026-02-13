export const sanitizeValue = (value) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const today = () => new Date().toISOString().slice(0, 10);

export const detectMostUsed = (items, key, fallback = 'N/A') => {
  if (!items.length) return fallback;
  const counts = items.reduce((acc, item) => {
    const val = item[key] || fallback;
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || fallback;
};
