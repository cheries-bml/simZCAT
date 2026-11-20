# CAT Learning — Computer Assisted Test

Modern, simple CAT app. No database. JSON files only. All data loads with **GET**. Updates are made by editing JSON / files and pushing to GitHub.

## Live demo (GitHub Pages)

1. Push this folder to GitHub (see below)
2. Settings → Pages → Deploy from branch → `main` / `/ (root)`
3. Open `https://<username>.github.io/<repo>/`

> If you push the `cat-app` folder itself as the repo root, the URL above works. If you push it as a subfolder, open `.../<repo>/cat-app/`.

## Folder structure

```
index.html
css/style.css
js/app.js
data/
  users.json    — login (SHA-256 passwordHash)
  roles.json    — permissions per role
  config.json   — app name, question files, materials list
questions/
  sample-english.json
materials/
  sample-notes.md / sample-notes.txt / sample-worksheet.pdf
.nojekyll
README.md
```

## Login (demo)

| Username | Password | Role |
|---|---|---|
| `super` | `Super123!` | super — full access, Admin page |
| `teacher` | `Teach123!` | teacher — can peek + show explanations |
| `student` | `Learn123!` | student — takes tests only |

Change passwords in `data/users.json`. Hash a new password with:
```bash
echo -n "NewPass123!" | shasum -a 256
# or: python3 -c "import hashlib; print(hashlib.sha256(b'NewPass123!').hexdigest())"
```
Put the hex hash in `passwordHash`. Never commit plain passwords.

## Features

- **CAT test generator:** Choose test file, difficulty (Easy = level 1-2, Intermediate = 3, Advanced = 4-5, Mixed = all), count (5 / 10 / 20 / All / custom), timer (Off / Fast / Normal / Relaxed), shuffle.
- **Question types:** `multiple_choice` (supports multiple correct options) and `correction` (click segments, type corrections, No Error).
- **Teaching mode — same page:** If `roles.json` gives `canPeekAnswer` / `canShowExplanation`, a Teaching bar appears on the test page. Teacher can toggle Peek answers and Show explanations per test. Students never see it.
- **Materials:** PDF, PNG/JPG, TXT, MD. Add file to `/materials/` + entry in `config.json` → `materials[]` with `{title, description, file, type}`. Types: `pdf`, `image`, `text`, `markdown`.
- **Admin (super only):** Shows config, roles, question counts, and users (names + roles only). No passwords/hashes shown. Enforced in `js/app.js` via `canViewAdmin`.
- **Modals only:** No alert dialogs. All dialogs use the modal system.
- **Results:** Score + review shown after submit. History saved in browser `localStorage` only.

## How to update data (no POST)

All updates are file edits + git push:

```bash
git add .
git commit -m "Update questions / users / materials"
git push
```

GitHub Pages rebuilds automatically (1-2 min).

- Add questions: create `/questions/my-test.json` in the same format as `sample-english.json`, then add it to `config.json` → `questionFiles`.
- Change roles: edit `data/roles.json` permissions.
- Add material: put file in `/materials/`, add to `config.json` → `materials`.

## Question file format

See `questions/sample-english.json`. Key fields:

- `meta.title / description / author`
- `questions[].config.level` (1-5), `time_in_seconds: {fast, normal, easy}`
- `multiple_choice`: `data.hint / passage / question / image`, `options: {A:{text, correct}}`, `explanation: {text, topic, concept, formula, examples}`
- `correction`: `data.multiErrorSegments: [{id, text, clickable, isError, correctAnswers[]}]`

## Local preview

```bash
# from inside cat-app/
python3 -m http.server 8000
# open http://localhost:8000
```
Do not open via `file://` — `fetch()` for JSON is blocked.

## Security note

This is a static demo auth (hash comparison in browser). It is suitable for classroom / low-stakes use. Do not use it for high-stakes exams or to protect truly sensitive data — anyone who can read the repo can read `users.json` hashes.
