export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date ? date.toLocaleDateString() : "-";
}

export function formatLocation(city, country) {
  return [city, country].filter(Boolean).join(", ") || "Unknown";
}
