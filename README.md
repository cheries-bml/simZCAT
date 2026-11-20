# CAT Learning — GitHub Pages App

Static app. No database. No POST. All data via GET from JSON.

## Structure
```
cat-app/
  index.html
  css/style.css
  js/
    utils.js  auth.js  cat.js  teach.js  materials.js  generator.js  app.js
  data/
    users.json  roles.json  config.json  materials.json
  questions/
    sample.json  <- your format: { questions: [{id, question, options[], answer, difficulty, explanation, topic, subject}] }
  materials/
    *.pdf *.png *.jpg *.txt *.md
  .nojekyll
```

## Deploy to GitHub Pages
1. Create repo, upload all files to root (or `docs/`).
2. Settings → Pages → Branch: `main` → `/ (root)` → Save.
3. Open `https://<username>.github.io/<repo>/`

## Update Data (No POST)
Edit files directly in GitHub web UI → Commit. Pages redeploys automatically.
- Users: `data/users.json` — password is SHA-256 hex. Generate: `echo -n "Password123!" | shasum -a 256`
- Roles: `data/roles.json`
- Config: `data/config.json` — `questionFiles` lists files in `questions/`
- Questions: add file in `questions/` + list it in `config.json`
- Materials: add file in `materials/` + entry in `data/materials.json` (`type`: pdf/png/jpg/txt/md)

## Roles
- `super`: all + Admin page
- `teacher`: dashboard, CAT, Teaching, Materials, Generate
- `student`: dashboard, CAT, Materials

Admin page is `super`-only. No sensitive data is shown in UI.

## Demo Accounts
- super / Super123!
- guru1 / Guru123!
- siswa1 / Siswa123!

Change these before production. This is demo auth for static hosting, not for real secure exams.

## Icons
Lucide via CDN: `https://unpkg.com/lucide@latest` — free, MIT.

## Next: Your Question File
Upload your sample JSON next. It must match:
```json
{"questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer":1,"difficulty":"easy","explanation":"...","topic":"...","subject":"..."}]}
```
`answer` can be index (0-based) or exact option text. `difficulty`: `easy` | `intermediate` | `advanced`.
