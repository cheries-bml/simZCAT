// Admin page: generate password hashes for data/users.json and check a password against a stored hash.
// Everything runs in the browser; nothing is sent anywhere.
import { el } from "./util.js";
import { hashPassword } from "./auth.js";

async function copy(text, btn) {
  const label = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch { btn.textContent = "Copy failed"; }
  setTimeout(() => (btn.textContent = label), 1500);
}

function copyButton(getText) {
  const btn = el("button", { type: "button", className: "btn btn-ghost", textContent: "Copy" });
  btn.addEventListener("click", () => copy(getText(), btn));
  return btn;
}

const field = (label, input) => el("label", { className: "field" }, el("span", { textContent: label }), input);
const panel = (title, ...children) => el("section", { className: "panel" }, el("h2", { textContent: title }), ...children);

export function renderPasswordTool({ config, users }) {
  const salt = config.passwordSalt;

  // ---------- Generate ----------
  const gUser = el("input", { type: "text", autocomplete: "off", placeholder: "e.g. sam" });
  const gPass = el("input", { type: "password", autocomplete: "new-password", placeholder: "Password to hash" });
  const gShow = el("input", { type: "checkbox", onchange: () => { gPass.type = gShow.checked ? "text" : "password"; } });
  const hashOut = el("code", { className: "hash" });
  const entryOut = el("pre", {});
  const out = el("div", { className: "tool-out", hidden: true },
    el("strong", { textContent: "passwordHash" }), hashOut, copyButton(() => hashOut.textContent),
    el("strong", { textContent: "Ready-to-paste user entry" }), entryOut, copyButton(() => entryOut.textContent));

  let seq = 0;
  async function update() {
    const id = ++seq, user = gUser.value.trim().toLowerCase(), pass = gPass.value;
    if (!user || !pass) { out.hidden = true; return; }
    try {
      const hash = await hashPassword(config, user, pass);
      if (id !== seq) return; // a newer keystroke is already being processed
      hashOut.textContent = hash;
      entryOut.textContent = JSON.stringify({ username: user, name: "Full Name", email: "name@example.com", roles: ["viewer"], active: true, passwordHash: hash }, null, 2);
    } catch {
      hashOut.textContent = "Hashing needs a secure page (https:// or localhost).";
      entryOut.textContent = "";
    }
    out.hidden = false;
  }
  gUser.addEventListener("input", update);
  gPass.addEventListener("input", update);

  // ---------- Verify ----------
  const vUser = el("select", {}, ...users.map((u) => el("option", { value: u.username, textContent: u.username })));
  const vPass = el("input", { type: "password", autocomplete: "off", placeholder: "Password to test" });
  const vResult = el("p", { role: "status" });
  async function check() {
    const user = users.find((u) => u.username === vUser.value);
    if (!user || !vPass.value) { vResult.textContent = ""; return; }
    const ok = (await hashPassword(config, user.username, vPass.value)) === String(user.passwordHash || "").toLowerCase();
    vResult.className = ok ? "result-ok" : "result-bad";
    vResult.textContent = ok ? `✓ Matches the stored hash for “${user.username}”.` : `✗ Does not match the stored hash for “${user.username}”.`;
  }
  vPass.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  vPass.addEventListener("input", () => { vResult.textContent = ""; });
  vUser.addEventListener("change", () => { vResult.textContent = ""; });

  return [
    el("h1", { textContent: "Passwords" }),
    el("p", { className: "lede", textContent: "Create password hashes for data/users.json, and check a password against a stored hash." }),

    panel("How passwords are stored",
      el("ul", { className: "notes" },
        el("li", {}, "Each user has a ", el("code", { textContent: "passwordHash" }), " in ", el("code", { textContent: "data/users.json" }),
          ": the SHA-256 of ", el("code", { textContent: "passwordSalt:username:password" }),
          " (64 hex characters). The salt comes from ", el("code", { textContent: "data/config.json" }), "; the username is lowercase."),
        el("li", {}, el("strong", { textContent: "A hash cannot be turned back into the password. " }),
          "Hashing is one-way by design, so the original text can never be read from it."),
        el("li", {}, "To check a password, use “Check a password” below: it hashes your guess and compares it with the stored hash."),
        el("li", {}, "To recover access (forgotten password), generate a new hash and replace the old ", el("code", { textContent: "passwordHash" }), "."),
        el("li", {}, "Renaming a user or changing the salt invalidates the hash, so generate it again."),
        el("li", {}, "The file is public, so anyone can try guesses offline. Use long, unique passwords."))),

    panel("Generate a hash",
      el("div", { className: "tool-form" },
        field("Username", gUser),
        field("Password", gPass),
        el("label", { className: "check-row" }, gShow, "Show password")),
      out,
      el("ol", { className: "notes" },
        el("li", { textContent: "Copy the user entry and paste it into data/users.json (edit name, email and roles)." }),
        el("li", { textContent: "Commit and push to GitHub, then wait for GitHub Pages to redeploy." }))),

    panel("Check a password",
      el("div", { className: "tool-form" }, field("User", vUser), field("Password to test", vPass),
        el("button", { className: "btn btn-ghost", type: "button", textContent: "Check", onclick: check })),
      vResult),

    el("details", { className: "panel" },
      el("summary", { textContent: "Generate on the command line (Python)" }),
      el("p", { className: "muted", textContent: "This prompts for the password without showing it or saving it in your shell history:" }),
      el("pre", { textContent: "python3 scripts/hash_password.py sam" }),
      el("p", { className: "muted", textContent: "Or as a one-liner (avoid for passwords with special characters):" }),
      el("pre", { textContent: `python3 -c "import hashlib; print(hashlib.sha256('${salt}:sam:mypassword'.encode()).hexdigest())"` })),
  ];
}
