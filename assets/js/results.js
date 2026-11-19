// Test attempts are saved in this browser's localStorage (the app has no server to send them to).
const KEY = "app.attempts";
const MAX = 500;

function read() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(all) ? all : [];
  } catch { return []; }
}

export function addAttempt(attempt) {
  try {
    const all = read();
    all.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...attempt });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX)));
  } catch { /* storage unavailable or full */ }
}

/** Newest first. Pass { username } to filter to one user. */
export const listAttempts = ({ username } = {}) =>
  read().filter((a) => !username || a.username === username).sort((a, b) => b.ts - a.ts);

export const lastAttempt = (username, testPath) =>
  listAttempts({ username }).find((a) => a.testPath === testPath) ?? null;

/** No username = clear everything. */
export function clearAttempts(username) {
  try {
    if (!username) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(read().filter((a) => a.username !== username)));
  } catch { /* ignore */ }
}
