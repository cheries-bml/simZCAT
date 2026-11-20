# CAT Learning — Computer Assisted Test

Static web app for GitHub Pages. No database, no POST. All data via GET from JSON.

## Structure
```
index.html
css/style.css
js/
  utils.js
  auth.js
  cat.js
  teach.js
  materials.js
  generator.js
  app.js
data/
  users.json
  roles.json
  config.json
questions/
  index.json
  sample-english.json
materials/
  index.json
  sample-notes.md
  sample-notes.txt
```

## Run locally
```bash
python -m http.server 8000
# open http://localhost:8000
```
Do NOT open via file:// — fetch() needs HTTP.

## Deploy to GitHub Pages
1. Push this folder to a repo (root or /docs).
2. Repo → Settings → Pages → Source: Deploy from branch, Folder: / (root) or /docs.
3. Open `https://YOUR-USERNAME.github.io/YOUR-REPO/`
4. Update `data/config.json` → `githubRepoUrl` with your real repo URL.

## Login
- Passwords in `data/users.json` are SHA-256 hashes. Login hashes the entered password in the browser and compares.
- Demo accounts (change passwords + hashes before real use):
  - super / Super123! → role super (sees Manage Data)
  - teacher / Teach123! → role teacher
  - student / Student123! → role student

Generate a hash:
```bash
python -c "import hashlib; print(hashlib.sha256(b'YourPassword'.encode()).hexdigest())"
```

## Roles
- `super`: dashboard, take_test, teach, materials, generate, manage_data
- `teacher`: dashboard, take_test, teach, materials, generate
- `student`: dashboard, take_test, materials

Only `super` sees Manage Data. Manage Data never shows password hashes.

## Questions
Add a file in `/questions/` (same shape as `sample-english.json`), then add an entry to `questions/index.json`:
```json
{"id":"my-test","file":"questions/my-test.json","title":"My Test","description":"...","count":10}
```
Levels: 1-2 = Easy, 3 = Intermediate, 4-5 = Advanced.
Types: `multiple_choice` (set `correct:true` on correct options; multiple correct = checkbox) and `correction` (`multiErrorSegments` with `isError` + `correctAnswers`).

## Materials
Add file to `/materials/` and entry to `materials/index.json`:
```json
{"id":"x","title":"...","type":"pdf","file":"materials/x.pdf","description":"..."}
```
Types: pdf, png, jpg, txt, md.

## Updating data
Edit JSON in GitHub → Commit → Push. The app re-fetches on reload. No POST, no server.
