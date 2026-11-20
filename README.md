# CAT Learning — GitHub Pages App

No database. No POST. All data is JSON / MD / TXT / PDF / images. All requests are GET (`fetch()`).

## Structure
```
index.html
css/style.css
js/
  utils.js  auth.js  cat.js  teaching.js  materials.js  generator.js  admin.js  app.js
data/
  users.json  roles.json  config.json  materials.json
questions/
  index.json  sample.json   <- add your question files here
materials/
  sample-notes.md  sample.txt  <- add PDF / PNG / JPG / TXT / MD here
```

## Demo logins (change before live use)
- super / Super123! — full access, incl. Admin
- teacher / Teacher123! — CAT, Teaching, Materials, Generator
- student / Student123! — CAT, Teaching, Materials

Passwords are SHA-256 hashes in `data/users.json`. Generate a hash in browser console:
```js
await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPass123'))
// convert to hex, paste as passwordHash
```

## Question file format — `questions/your-file.json`
```json
{
  "meta": {"title": "Topic", "subject": "Math"},
  "questions": [
    {"id":"Q01","topic":"Math","difficulty":"easy","question":"...?","options":["A","B","C","D"],"answerIndex":1,"explanation":"..."}
  ]
}
```
Difficulty: `easy` | `intermediate` | `advanced`. Register the file in `questions/index.json`.

## Materials
Add file to `materials/` and entry to `data/materials.json`:
`{"title":"...","file":"file.pdf","type":"pdf"}` — type: `pdf` | `png` | `jpg` | `txt` | `md`

## Roles
`data/roles.json` controls access. Only `super` can open **Admin**. Admin never shows passwords/hashes.

## Deploy to GitHub Pages
1. Create repo, push this folder contents to `main`.
2. Repo → Settings → Pages → Source: Deploy from branch → Branch: `main` / `/ (root)` → Save.
3. Open `https://<username>.github.io/<repo>/`

To update: edit JSON/MD files locally, commit, push. Pages rebuilds automatically.
