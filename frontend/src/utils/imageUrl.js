const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function resolveImageUrl(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return "";
  }

  const value = imageUrl.trim();
  try {
    const url = new URL(value, window.location.origin);
    if (LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}
