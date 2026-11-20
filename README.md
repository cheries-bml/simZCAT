# CAT Learning — Static CAT App for GitHub Pages

No database. No POST. All data in JSON. All updates via Git push.

## Structure
```
index.html
css/style.css
js/app.js
data/
  config.json
  roles.json
  users.json
  materials.json
questions/
  index.json
  sample-english.json
materials/
  simple-present.md
```

## Deploy to GitHub Pages
1. Create repo, push this folder to `main` (root).
2. GitHub → Settings → Pages → Source: Deploy from branch → `main` / `/ (root)` → Save.
3. Open `https://<username>.github.io/<repo>/`
4. `.nojekyll` is included so `data/` and `questions/` are served as-is.

> GitHub Pages serves static files only. `fetch()` with GET is the only request type used.

## Login — Demo accounts
Change these before going live. Passwords are stored as SHA-256 in `data/users.json`.

| Username | Password | Role |
|---|---|---|
| `super` | `Super123!` | super — full access incl. System |
| `teacher` | `Teacher123!` | teacher — teach, generate, materials |
| `student` | `Student123!` | student — take test, materials |

### Change / add a user
Generate hash:
```bash
python3 -c "import hashlib; print(hashlib.sha256('YourNewPass123!'.encode()).hexdigest())"
# or in browser console:
# await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourNewPass123!'))
```
Add to `data/users.json`:
```json
{ "username": "rina", "name": "Rina", "role": "teacher", "active": true, "passwordHash": "<sha256>" }
```
Commit + push. No password is ever shown in the app UI.

## Roles — `data/roles.json`
- `super`: take_test, teach, view_materials, generate_test, view_system, manage_data
- `teacher`: take_test, teach, view_materials, generate_test
- `student`: take_test, view_materials

**Only `super` sees the System page.** That page never shows passwords or hashes. Keep the rest of the UI minimal — no verbose / sensitive text.

## Questions — `/questions/`
Your sample format is supported as-is:
- `multiple_choice` — `options: {A:{text, correct?}}`. If >1 `correct:true`, UI uses checkboxes and requires exact match.
- `correction` — `multiErrorSegments: [{id,text,clickable,isError,correctAnswers[]}]`. Student taps error parts + types correction. Scoring is exact on selected errors + normalized correction match.

Add a file:
1. Copy `questions/sample-english.json` → `questions/my-test.json`
2. Edit `meta` + `questions[]`
3. Add to `questions/index.json`:
```json
{ "file": "questions/my-test.json", "title": "My Test", "subject": "English", "count": 10 }
```
4. Commit + push.

**Levels → Difficulty**
- Easy = `config.level` 1–2
- Intermediate = 3
- Advanced = 4–5

`config.time_in_seconds: {fast, normal, easy}` per question. Timer = sum of chosen pace.

**Teaching:** Teacher loads a test in Teach mode, reveals Answer / Explanation per question. Respects `show_answer` / `show_explanation` in file config by defaulting to hidden until revealed.

## Materials — `/materials/`
Supported: `.pdf`, `.png`, `.jpg`, `.txt`, `.md`
1. Put file in `materials/`
2. Add to `data/materials.json`:
```json
{ "id": "m4", "title": "My File", "file": "materials/my-file.pdf", "type": "pdf", "subject": "English", "forRole": ["student","teacher","super"] }
```
3. Commit + push. Viewer: PDF in iframe, image inline, TXT/MD rendered.

## Updating data
There is no admin write / POST in the app by design.
Edit JSON locally or in GitHub web UI → Commit → Push → Pages redeploys.
System page (super only) lets you download current `config.json` / `roles.json` / safe `users.json` (no hashes) to edit and re-commit.

## Icons
Material Symbols Outlined (Google Fonts, free) via CDN in `index.html`:
`<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...">`
Usage: `<span class="material-symbols-outlined">quiz</span>`

## Local preview
```bash
# from this folder
python3 -m http.server 8000
# open http://localhost:8000
```
Do NOT open via `file://` — `fetch()` for JSON will be blocked by CORS.

## Security notes
- This is a demo static auth (SHA-256 in JSON). Do not use for high-stakes exams or real personal data.
- For production, put the site behind GitHub Pages + a real auth layer, or use it only on a trusted network.
