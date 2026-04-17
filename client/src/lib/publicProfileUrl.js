const DEFAULT_APP_BASE_URL = "http://localhost:5173";

function getAppBaseUrl() {
  return String(import.meta.env.VITE_APP_BASE_URL || DEFAULT_APP_BASE_URL).replace(/\/+$/, "");
}

export function getPublicProfileHost() {
  try {
    const url = new URL(getAppBaseUrl());
    return url.host;
  } catch {
    return getAppBaseUrl().replace(/^https?:\/\//, "");
  }
}

/** Canonical public URL for profile (with @username). */
export function getPublicProfilePageUrl(username) {
  if (!username) return "";
  return `${getAppBaseUrl()}/@${encodeURIComponent(String(username).trim())}`;
}
