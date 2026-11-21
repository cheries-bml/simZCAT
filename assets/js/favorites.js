// Favorite tests, saved per user in this browser.
const key = (username) => `app.favorites.${username}`;

export function getFavorites(username) {
  try {
    const list = JSON.parse(localStorage.getItem(key(username)));
    return new Set(Array.isArray(list) ? list : []);
  } catch { return new Set(); }
}

/** Returns true when the test is now a favorite. */
export function toggleFavorite(username, path) {
  const favs = getFavorites(username);
  if (favs.has(path)) favs.delete(path); else favs.add(path);
  try { localStorage.setItem(key(username), JSON.stringify([...favs])); } catch { /* ignore */ }
  return favs.has(path);
}
