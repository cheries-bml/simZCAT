# SimpleAuth v4.0.0 — Rebuilt, works on file:// + GitHub Pages

## What was fixed from v3
1. **Login failed on file:// / http** — `crypto.subtle` only works on https/localhost. Now: try subtle, fallback to `passwordHint` compare. Login works everywhere.
2. **fetch() failed on file://** — Now: if `fetch(data/*.json)` or `fetch(questions/*.json)` fails, app uses built-in fallback data (same demo users + same sample test). You still see the app, Test, and CAT.
3. **CAT Next needed 2 clicks / was confusing** — Now: single primary button: `Check answer` → `Next →` → `Finish ✓`. One click per step.
4. **Flag re-rendered question and lost typed corrections** — Now: Flag only toggles dot, does NOT re-render.
5. **All DOM access guarded** — `if(el)` checks everywhere, global error banner instead of white screen.
6. **Back navigation restores answers** — MCQ selections + correction inputs are restored when you go Prev.

## Structure
```
├── index.html
├── assets/css/style.css
├── assets/js/app.js  # auth, nav, overview, reports, fallback
├── assets/js/cat.js  # discovery + CAT, fallback test
├── data/config.json  # version 4.0.0
├── data/roles.json
├── data/users.json
├── questions/manifest.json
└── questions/sample_question.json
```

## How to test locally (best way)
Option A — GitHub Pages (recommended): push folder → Settings → Pages → main / (root)
Option B — Local server: `npx serve .` or `python -m http.server 8000` then open `http://localhost:8000`
Option C — Double-click `index.html`: works now via fallback, but to test real JSON files use A or B.

## Demo
- admin / admin123
- manager / manager123
- staff / staff123

## Test
Nav: Overview | Test | Reports
- Test page loads from `questions/manifest.json` via GET. Add file → add to manifest → Reload.
- CAT: Q1 multiple_choice (2 correct: C + E), Q2 correction (tap s2, s5, type corrections).

## Note
Demo only. `users.json` is public — don't use real passwords.
