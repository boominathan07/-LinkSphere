export function getGeoFromIp(ip) {
  // Simple geo detection - can be enhanced with geoip-lite later
  return {
    country: "Unknown",
    city: "Unknown",
    region: "Unknown"
  };
}