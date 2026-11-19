// Shared auth helpers. NOTE: static hosting means this is client-side only;
// it gates the UI but cannot protect secrets. See README.

const SESSION_KEY = "app.session";
const LOCK_KEY = "app.lock";

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

// ----- password hashing -----
// hash = SHA-256 of "<passwordSalt>:<username in lowercase>:<password>", as 64 hex characters.
// Hashing is one-way: a hash cannot be turned back into the password.
export async function hashPassword(config, username, password) {
  const text = `${config.passwordSalt}:${username.trim().toLowerCase()}:${password}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ----- roles & permissions -----
/** A user may have several roles: "roles": ["editor", "auditor"] (a single string also works). */
export function userRoles(user) {
  const r = user.roles ?? user.role;
  return (Array.isArray(r) ? r : [r]).filter((x) => typeof x === "string" && x);
}

export const roleLabel = (roles, key) => roles[key]?.label ?? key;

/** Union of the permissions of all the user's roles. Unknown roles grant nothing. */
export function permissionsOf(session, roles) {
  const all = new Set();
  for (const key of session.roles) (roles[key]?.permissions ?? []).forEach((p) => all.add(p));
  return [...all];
}

/** Special features (e.g. show_answer, timer_disabler): union over all of the user's roles. */
export function specialsOf(session, roles) {
  const all = new Set();
  for (const key of session.roles) (roles[key]?.special ?? []).forEach((f) => all.add(f));
  return [...all];
}

export const can = (session, roles, permission) => permissionsOf(session, roles).includes(permission);

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
    if (s && Array.isArray(s.roles) && s.expires > Date.now()) return s;
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
  const hash = await hashPassword(config, username, password);
  const valid = !!user && user.active && hash === String(user.passwordHash || "").toLowerCase();

  if (!valid) {
    registerFailure(config);
    return { ok: false, message: "Username or password is incorrect." };
  }

  localStorage.removeItem(LOCK_KEY);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username,
    name: user.name,
    roles: userRoles(user),
    expires: Date.now() + config.sessionMinutes * 60000,
  }));
  return { ok: true };
}
