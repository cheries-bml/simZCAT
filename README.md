# Northfield Console

Static login + computer-assisted test app for GitHub Pages. Plain HTML, CSS and JavaScript; users, roles, settings and questions all live in JSON files. The browser only ever makes GET requests for those files.

## Structure

```
.
├── index.html                 Login page
├── dashboard.html             App shell (Overview, Test, Reports, Users, Settings)
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── auth.js            Data loading, hashing, session, lockout, permissions
│       ├── util.js            DOM helpers + HTML allowlist sanitizer
│       ├── login.js
│       ├── dashboard.js       Sections shown by role permissions
│       ├── catalog.js         Loads the tests listed in the index
│       ├── test-engine.js     Scoring, timing, answer formatting (no DOM)
│       └── test-ui.js         Test catalog, intro, runner, results
├── data/
│   └── config.json  roles.json  users.json
├── manifests/
│   └── questions-manifest.json   List of question files the app reads
├── questions/                 Your question files, any folder depth
│   └── sample_question.json
├── scripts/build_manifest.py  Optional: scans /questions recursively -> manifests/questions-manifest.json
└── .github/workflows/build-manifest.yml   Optional: rebuilds the manifest on every push
```

## Adding tests

The app reads `manifests/questions-manifest.json` to know which question files exist:

```json
{ "files": ["questions/sample_question.json", "questions/english/grammar.json"] }
```

1. Put a question JSON file anywhere under `questions/` (subfolders are fine; the folder name becomes the card label).
2. Add its path to the manifest, either way:
   - **By hand:** edit `manifests/questions-manifest.json`.
   - **Generated:** run `python3 scripts/build_manifest.py`, which scans `questions/` recursively and rewrites the manifest. The included GitHub Action does the same on every push that touches `questions/`.

Why a manifest? GitHub Pages is static, so a browser cannot list a folder. The browser loads the manifest, then each listed file, all with GET requests. Files without `meta` and a `questions` array are ignored, and `meta.config.active: false` hides a test.

## Question file format

- `meta`: `title`, `description`, `info`, `author`, `config` (`active`, `no_timer`, `show_answer`, `show_explanation`).
- `questions[]`: `id`, `type`, `data`, `explanation`, `config` (`level`, `show_answer`, `show_explanation`, `time_in_seconds`).
- **`multiple_choice`**: `options` keyed by letter; options with `"correct": true` are the answers. Two or more correct options turn the question into select-all (checkboxes). Scoring is all-or-nothing.
- **`correction`**: `multiErrorSegments`. The user clicks the clickable segments they think are wrong and types a fix; "No error" is also available. A question is correct when the marked segments are exactly those with `isError: true` and every typed fix matches one of `correctAnswers` (case, spacing and edge punctuation ignored). With no `isError` segments, "No error" is the right answer.
- **Timing:** the user picks a pace (`fast`, `normal`, `easy`). Total time is the sum of each question's `time_in_seconds` for that pace. `no_timer: true` removes the limit and shows elapsed time instead.
- **Feedback:** correct answers and explanations appear in the results review. Question-level `show_answer` / `show_explanation` override the test-level values.
- Light HTML (`<b>`, `<br>`, `<i>`, lists) is allowed in text fields; everything else is stripped.

## Demo accounts

| Username | Password  | Role   |
|----------|-----------|--------|
| admin    | admin123  | admin  |
| editor   | editor123 | editor |
| viewer   | viewer123 | viewer |

New users: set `passwordHash` to the SHA-256 of `passwordSalt` + password, e.g. `printf '%s' "your-saltnewpassword" | sha256sum`. If you change the salt in `config.json`, regenerate every hash.

## Run locally

`fetch()` and ES modules need a web server (not `file://`):

```
python3 -m http.server 8000
```

## Deploy to GitHub Pages

Push to a repo, then Settings → Pages → Deploy from a branch → `main` / root. All paths are relative, so project sites under `/<repo>/` work.

## Security note

This is static hosting: every JSON file, including question files with their correct answers, is publicly downloadable. The login controls what the interface shows but cannot protect secrets. Do not use it for high-stakes exams or private data.
