export function getDeviceFromUserAgent(userAgent) {
  const ua = userAgent || "";
  let device = "desktop";
  let browser = "unknown";
  let os = "unknown";

  // Detect device
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device = "mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    device = "tablet";
  }

  // Detect browser
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = "chrome";
  else if (/firefox/i.test(ua)) browser = "firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "safari";
  else if (/edg/i.test(ua)) browser = "edge";
  else if (/opera|opr/i.test(ua)) browser = "opera";

  // Detect OS
  if (/windows/i.test(ua)) os = "windows";
  else if (/mac/i.test(ua)) os = "macos";
  else if (/linux/i.test(ua)) os = "linux";
  else if (/android/i.test(ua)) os = "android";
  else if (/ios|iphone|ipad/i.test(ua)) os = "ios";

  return { device, browser, os };
}