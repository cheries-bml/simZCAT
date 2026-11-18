// Shared auth helpers. NOTE: static hosting means this is client-side only;
// it gates the UI but cannot protect secrets. See README.

const SESSION_KEY = "app.session";
const LOCK_KEY = "app.lock";

// The only network calls in the app: plain GET requests for static JSON files.
export async function loadJSON(path) {
  const res = await fetch(path, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export async function loadData() {
  const [config, usersFile, rolesFile] = await Promise.all([
    loadJSON("data/config.json"),
    loadJSON("data/users.json"),
    loadJSON("data/roles.json"),
  ]);
  return { config, users: usersFile.users, roles: rolesFile.roles };
}

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ----- lockout after repeated failures -----
function readLock() {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { count: 0, until: 0 }; }
  catch { return { count: 0, until: 0 }; }
}

function registerFailure(config) {
  const lock = readLock();
  lock.count += 1;
  if (lock.count >= config.maxFailedAttempts) {
    lock.until = Date.now() + config.lockoutMinutes * 60000;
    lock.count = 0;
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
}

// ----- session -----
export function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (s && s.expires > Date.now()) return s;
  } catch { /* ignore */ }
  sessionStorage.removeItem(SESSION_KEY);
  return null;
}

export function touchSession(config) {
  const s = getSession();
  if (!s) return;
  s.expires = Date.now() + config.sessionMinutes * 60000;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function logout(config) {
  sessionStorage.removeItem(SESSION_KEY);
  location.replace(config.loginPage);
}

/** Returns { ok: true } or { ok: false, message } */
export async function login(username, password, { config, users }) {
  const lock = readLock();
  if (lock.until > Date.now()) {
    const mins = Math.ceil((lock.until - Date.now()) / 60000);
    return { ok: false, message: `Too many attempts. Try again in ${mins} min.` };
  }

  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  const hash = await sha256(config.passwordSalt + password);

  if (!user || !user.active || user.passwordHash !== hash) {
    registerFailure(config);
    return { ok: false, message: "Username or password is incorrect." };
  }

  localStorage.removeItem(LOCK_KEY);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username,
    name: user.name,
    role: user.role,
    expires: Date.now() + config.sessionMinutes * 60000,
  }));
  return { ok: true };
}

export function can(session, roles, permission) {
  const role = roles[session.role];
  return !!role && role.permissions.includes(permission);
}
