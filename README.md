# SimpleAuth v3.0.0 — Login + CAT

JSON-only. No DB. GET only. Tests from `/questions/`.

## Structure
```
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── app.js   # auth + nav + overview + reports
│       └── cat.js   # test discovery + CAT engine
├── data/
│   ├── config.json  # version 3.0.0
│   ├── roles.json
│   └── users.json
├── questions/
│   ├── manifest.json         # list of test files — REQUIRED for GitHub Pages
│   └── sample_question.json  # your sample
└── .nojekyll
```

## Nav
Overview | **Test** | Reports

Test sits between Overview and Reports, as requested.

## How Test discovery works (recursive via manifest)
GitHub Pages cannot list a folder. So:
1. `cat.js` does `GET questions/manifest.json`
2. For each path in `tests[]`, it does `GET questions/<path>`
3. Renders a card per file

To add a test:
- Put `my-test.json` in `/questions/` or subfolder, e.g. `/questions/english/grammar-1.json`
- Add `"english/grammar-1.json"` to `manifest.json` → `{"tests": ["sample_question.json", "english/grammar-1.json"]}`
- Reload. No build step.

## CAT — what it supports from your sample
- `meta.title/description/info/author/config` (show_answer, show_explanation, no_timer)
- `questions[].type`: `multiple_choice` + `correction`
- `multiple_choice`: `data.hint/passage/image/question`, `options {A..E: {text, correct}}` — supports 1 or multiple correct (checkbox when >1 correct, e.g. Q1 has C + E correct)
- `correction`: `data.multiErrorSegments[] {id, text, clickable, isError, correctAnswers[]}` — tap segment → type correction. `No Error` if 0 errors. Validation is case-insensitive, trims spaces.
- Per-question: `config.level`, `config.time_in_seconds {fast, normal, easy}`, `config.show_answer/show_explanation`
- `explanation {text, topic, concept, formula, examples[]}` — shown after answer if enabled
- Flow: Intro → Q by Q → progress, timer, flag, hint, dots nav, Prev/Next → Result → Review → saved to Reports (localStorage)

## Demo logins
- admin / admin123
- manager / manager123
- staff / staff123

## Deploy
Push folder → GitHub → Settings → Pages → Branch: main / (root)

## Note
Demo auth only. `users.json` is public — don't use real passwords.
