export const CACHE_TTL = {
  ANALYTICS_SUMMARY: 300,
  ANALYTICS_CHARTS: 300,
  GEO_DATA: 600,
  ADMIN_STATS: 120,
  PUBLIC_PROFILE: 60
};

export function getCache(key) {
  return null;
}

export function setCache(key, value, ttl) {
  return null;
}

export function invalidateCacheByPrefix(prefix) {
  return null;
}