const DEFAULT_APP_BASE_URL = "https://linksphere.vercel.app";

function getAppBaseUrl() {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    // If on localhost, use localhost
    if (window.location.hostname === 'localhost') {
      return "http://localhost:5173";
    }
    // Otherwise use the current origin (Vercel URL)
    return window.location.origin;
  }
  
  // Fallback for server-side
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

export function getPublicProfilePageUrl(username) {
  if (!username) return "";
  return `${getAppBaseUrl()}/@${encodeURIComponent(String(username).trim())}`;
}