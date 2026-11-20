# CAT Learn — Computer Assisted Test

Static web app for GitHub Pages. No database. No POST requests. All data in JSON. All updates via GitHub commits.

## Features
- **Login** — `data/users.json` + SHA-256 password hashes. Session in `sessionStorage`.
- **Roles** — `data/roles.json`: `super`, `teacher`, `student`. Admin page is **Super only**.
- **CAT Test** — Generate tests by difficulty (Easy / Intermediate / Advanced) and question count from `questions/*.json`.
- **Teaching Mode** — Teacher / Super only. Discuss each question, show answer + explanation.
- **Materials** — PDF, PNG, JPG, TXT, MD from `materials/` + `data/materials.json`.
- **Question types** — `multiple_choice` (single or multi-correct) and `correction` (click segments + type correction).

## Folder Structure
```
index.html
assets/
  css/style.css
  js/
    utils.js
    auth.js
    cat.js
    teach.js
    materials.js
    admin.js
    app.js
data/
  users.json
  roles.json
  config.json
  materials.json
questions/
  sample-test.json
materials/
  sample-notes.md
  sample-notes.txt
README.md
.nojekyll
```

Icons: Google Material Symbols Outlined (free, CDN) + Inter font.

## Demo Accounts
| Username | Password | Role |
|---|---|---|
| super | super123 | super |
| teacher | teacher123 | teacher |
| student | student123 | student |

> Change passwords in `data/users.json`. Store only SHA-256 hashes, never plain text.
> Generate a hash: `echo -n "newpassword" | shasum -a 256` (macOS/Linux) or `echo -n "newpassword" | sha256sum`

## Deploy to GitHub Pages
1. Create a new GitHub repo, e.g. `cat-learn`.
2. Upload / push this whole folder to `main` branch.
3. Repo → Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → Save.
4. Open `https://<your-username>.github.io/cat-learn/`
5. Pages redeploys on every commit (~1 min).

> If your repo is a Project Page (not `username.github.io`), all paths in this app are **relative** (`assets/...`, `data/...`), so it works under `/cat-learn/` automatically. Do not use absolute `/` paths.

## Add / Edit Data (GET only)
- **Add a test:** Upload `questions/my-test.json` (same format as `sample-test.json`), then add it to `data/config.json`:
  ```json
  { "id": "my-test", "file": "questions/my-test.json", "label": "My Test" }
  ```
- **Add a question:** Append to `questions[].` in a file in `questions/`. Set `config.level`: 1–2 = Easy, 3 = Intermediate, 4–5 = Advanced.
- **Add a user:** Add to `data/users.json`:
  ```json
  { "username": "andi", "displayName": "Andi", "role": "student", "passwordHash": "<sha256>", "active": true }
  ```
- **Add material:** Upload to `materials/` (pdf/png/jpg/txt/md), add entry to `data/materials.json`:
  ```json
  { "id": "m3", "title": "My Handout", "file": "materials/my-handout.pdf", "type": "pdf", "description": "..." }
  ```
- **Change roles:** Edit `data/roles.json` permissions: `cat.take`, `cat.review`, `teach.view`, `materials.view`, `admin.view`.

## Question JSON Format
See `questions/sample-test.json`. Key fields:
- `meta.title`, `meta.description`, `meta.config.{show_answer, show_explanation, no_timer, active}`
- `questions[].type`: `multiple_choice` | `correction`
- `multiple_choice`: `data.{hint, passage, question, image}`, `options.{A-E}.{text, correct}`, `explanation.{text, topic, concept, formula, examples}`, `config.{level, time_in_seconds}`
- `correction`: `data.hint`, `multiErrorSegments[].{id, text, clickable, isError, correctAnswers}`, `explanation`, `config`

## Notes
- This is a **static demo auth** for classroom use. Do not store real sensitive data in `users.json` — the file is public on GitHub Pages.
- No POST requests are used. `fetch(..., {method:'GET'})` only. Edits happen directly in GitHub.
- To run locally: `python3 -m http.server 8000` in this folder, then open `http://localhost:8000` (opening `index.html` via `file://` will block `fetch`).
