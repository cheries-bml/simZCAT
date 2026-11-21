// "MyTest": generated tests a user chose to keep. Saved per user in this browser (no server).
const key = (username) => `app.mytests.${username}`;
const MAX = 50;

function read(username) {
  try {
    const list = JSON.parse(localStorage.getItem(key(username)));
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
const write = (username, list) => { try { localStorage.setItem(key(username), JSON.stringify(list.slice(-MAX))); } catch { /* storage full or unavailable */ } };

/** Newest first. Entries: { id, title, course, createdAt, items: [{ path, id, level, topic }] } */
export const listMyTests = (username) => read(username).sort((a, b) => b.createdAt - a.createdAt);

export function saveMyTest(username, entry) {
  const list = read(username).filter((e) => e.id !== entry.id);
  list.push({ createdAt: Date.now(), ...entry });
  write(username, list);
}

export const deleteMyTest = (username, id) => write(username, read(username).filter((e) => e.id !== id));
