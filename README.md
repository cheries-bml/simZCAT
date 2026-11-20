# CAT Learning — Computer Assisted Test

Modern, simple, static web app for GitHub Pages. No database. No POST. All data is JSON. All updates are made by editing JSON files and pushing to GitHub.

## Features

- **Login** with `data/users.json` (SHA-256 password hash, checked in browser)
- **Roles** in `data/roles.json`: `super`, `teacher`, `student`
  - Teacher / Super can **peek answers + explanations on the same test page** (Teaching mode)
  - Student cannot peek
  - **Verbose / sensitive pages (Admin) only for `super`**
- **CAT test**: generate by difficulty (Easy / Intermediate / Advanced) + question count, from JSON files in `/questions/`
- **Question types**: `multiple_choice` (supports multiple correct answers) and `correction` (click segments + type correction, No Error)
- **Materials**: PDF, PNG, JPG, TXT, MD from `/materials/` listed in `data/materials.json`
- **Icons**: Google Material Symbols (free, reliable CDN) + Inter font
- Split files: `index.html`, `css/style.css`, `js/*.js`, `data/*.json`

## Folder structure

```
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── store.js      # GET-only data layer + session
│   ├── auth.js       # login (SHA-256 compare)
│   ├── test.js       # generation, rendering, scoring, peek
│   ├── materials.js  # materials list + preview
│   └── app.js        # routing, dashboard, admin (super only)
├── data/
│   ├── users.json
│   ├── roles.json
│   ├── config.json
│   └── materials.json
├── questions/
│   ├── index.json
│   └── sample-english.json
├── materials/
│   ├── guide.md
│   ├── notes.txt
│   ├── sample.jpg
│   └── sample.pdf
├── README.md
└── .nojekyll
```

## Demo logins

| Username | Password | Role |
|---|---|---|
| `super` | `super123` | Super — full access, Admin |
| `teacher` | `teacher123` | Teacher — can teach / peek |
| `student` | `student123` | Student — test only |

> Change demo passwords before sharing publicly. Edit `data/users.json` and push.

## How to change a password

Passwords are stored as SHA-256 hex in `data/users.json`. Never store plain passwords.

Generate a hash:

```bash
# macOS / Linux
echo -n "newpassword123" | shasum -a 256
# or
python3 -c "import hashlib; print(hashlib.sha256(b'newpassword123').hexdigest())"
```

Put the hex in `passwordHash` for that user, commit, push.

## How to deploy to GitHub Pages

1. Create a repo, e.g. `cat-learning`
2. Push this folder to `main` (repo root)
3. GitHub → Settings → Pages → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → Save
4. Open `https://YOUR_USERNAME.github.io/cat-learning/`
5. `.nojekyll` is included so `data/` and files with `_` are served correctly.

Local preview (fetch needs http, not `file://`):

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000
```

## How to add a test

1. Copy `questions/sample-english.json` → e.g. `questions/math-1.json`
2. Keep the same shape: `meta` + `questions[]`
3. Difficulty is `config.level`: `1-2 = Easy`, `3 = Intermediate`, `4-5 = Advanced`
4. Add an entry in `questions/index.json`:
```json
{ "id": "math-1", "file": "math-1.json", "title": "Math 1", "description": "..." }
```
5. Push. The new test appears in Dashboard + Test setup.

Question shape (from sample):

```json
{
  "meta": { "title": "Test title", "description": "...", "info": "...", "author": "...", "config": { "show_answer": false, "show_explanation": false, "no_timer": true, "active": true } },
  "questions": [
    { "id": 1, "type": "multiple_choice", "data": { "hint": "...", "passage": "...", "question": "..." }, "options": { "A": { "text": "..." }, "C": { "text": "...", "correct": true } }, "explanation": { "text": "...", "topic": "...", "concept": "...", "formula": "...", "examples": ["..."] }, "config": { "level": 1, "time_in_seconds": { "fast": 15, "normal": 30, "easy": 60 } } },
    { "id": 2, "type": "correction", "data": { "hint": "..." }, "multiErrorSegments": [ { "id": "s1", "text": "Having", "clickable": false }, { "id": "s2", "text": "warning", "clickable": true, "isError": true, "correctAnswers": ["been warned"] } ], "explanation": { "text": "..." }, "config": { "level": 4 } }
  ]
}
```

## How to add materials

1. Put file in `/materials/` — allowed: `pdf`, `png`, `jpg`, `jpeg`, `txt`, `md`
2. Add entry in `data/materials.json`:
```json
{ "id": "week1", "title": "Week 1 Slides", "file": "week1.pdf", "type": "pdf", "description": "...", "subject": "English" }
```
3. Push.

## How to add / change users & roles

- Users: `data/users.json` — `username`, `displayName`, `role`, `passwordHash`, `active`
- Roles: `data/roles.json` — `permissions.canPeekAnswer`, `canPeekExplanation`, `canTeach`, `canViewAdmin`, `canViewVerbose`, etc.
- **Only `super` can open Admin.** The app hides Admin nav and blocks direct navigation for other roles. Password hashes are never shown in Admin UI.
- To update: edit JSON → commit → push. No POST, no server.

## Security notes (important for a static site)

- This is a **demo / classroom** auth model. `users.json` is fetched by the browser, so hashes are visible to anyone who can open DevTools. Do not use real / reused passwords.
- Session is in `sessionStorage` (cleared on tab close). No token is sent to a server.
- Keep sensitive content out of the repo, or use a private repo + private Pages if needed.

## Icons

- Material Symbols Outlined via Google Fonts CDN — `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined`
- If you need offline icons, replace with inline SVG in `index.html` (same icon names).
