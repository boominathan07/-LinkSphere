import geoip from "geoip-lite";

export function getGeoFromIp(ip) {
  // Remove IPv6 prefix and localhost
  let normalizedIp = String(ip || "")
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");
  
  // Handle localhost
  if (normalizedIp === "::1" || normalizedIp === "127.0.0.1" || normalizedIp === "localhost") {
    return { 
      country: "India", 
      city: "Chennai", 
      region: "TN" 
    };
  }
  
  // For mobile networks, IP might be from mobile carrier
  const geo = geoip.lookup(normalizedIp);
  
  if (!geo || !geo.country) {
    // Return default for testing
    return { 
      country: "India", 
      city: "Mumbai", 
      region: "MH" 
    };
  }
  
  return {
    country: geo.country,
    city: geo.city || "Unknown",
    region: geo.region || "Unknown"
  };
}