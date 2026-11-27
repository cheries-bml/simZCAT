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
│       ├── auth.js            Data loading, session, lockout, roles/permissions
│       ├── util.js            DOM helpers + HTML allowlist sanitizer
│       ├── login.js
│       ├── dashboard.js       Sections shown by role permissions
│       ├── password-tool.js   Admin page: generate / check password hashes
│       ├── reports.js         Reports page (saved test attempts)
│       ├── results.js         Saves attempts in localStorage
│       ├── modal.js           Modal dialogs (replace alert / confirm)
│       ├── home.js            Home page (the logo): welcome, newest tests, latest attempts, quotes
│       ├── brand.js           The logo (icon + appName + "by designer")
│       ├── icons.js           Inline icons (Material Design Icons)
│       ├── theme.js           Light / dark mode and accent themes
│       ├── theme-boot.js      Applies the saved theme before first paint
│       ├── filters.js         Test page toolbar and the Filter window
│       ├── favorites.js       Favorite tests (per user, in this browser)
│       ├── gentest.js         GenTest dialogs (random test from the question files)
│       ├── mytests.js         MyTest: saved generated tests (per user, in this browser)
│       ├── review.js          Opens a saved attempt for review (Reports and Home)
│       ├── files-ui.js        Files page: browse, filter, preview, open in new tab
│       ├── sound.js           SoundManager: reusable audio player (Audio API)
│       ├── sound-ui.js        The Listen button, progress bar and time
│       ├── about.js           About page (config.json + contact.json)
│       ├── markdown.js        Small safe Markdown renderer for the file viewer
│       ├── catalog.js         Loads the tests listed in the index
│       ├── test-engine.js     Scoring, timing, answer formatting (no DOM)
│       └── test-ui.js         Test catalog, intro, runner, results
├── data/
│   └── config.json  roles.json  users.json  contact.json
├── manifests/
│   ├── questions-manifest.json   List of question files the app reads
│   └── files-manifest.json       List of teaching files (path + size)
├── questions/                 Question files: questions/<level>/<course>/<topic>/<file>.json
│   ├── easy/english/grammar/sample_question.json
│   └── ...                    (easy | intermediate | advanced, then course, then topic)
├── qsound/                    Sound files for listening questions: qsound/<level>/<course>/<topic>/<test>/qN.mp3
├── files/                     Teaching materials: files/<level>/<course>/[<topic>/]<file>
│   └── easy/english/grammar-basics.md ...   (pdf, images, md, txt, audio, video, anything)
├── scripts/build_manifest.py  Optional: scans /questions recursively -> manifests/questions-manifest.json
└── .github/workflows/build-manifest.yml   Optional: rebuilds the manifest on every push
```

## Adding tests

Put question files in folders three levels deep:

```
questions/<level>/<course>/<topic>/<file>.json
questions/easy/english/grammar/articles.json
questions/advanced/math/algebra/quadratics.json
```

- Level 1 (`easy`, `intermediate`, `advanced`), level 2 (the course, e.g. `english`, `math`) and level 3 (the topic, e.g. `grammar`, `reading`, `algebra`) become the filters on the Test page. Use lowercase folder names; hyphens and underscores display as spaces. Other level, course and topic names work too.
- The app reads the list of files from `manifests/questions-manifest.json`. Browsers cannot list folders on GitHub Pages, so rebuild the manifest after adding files: run `python3 scripts/build_manifest.py` (it scans `questions/` and `files/` recursively and rebuilds both manifests), or let the GitHub Action do it on every push that touches `questions/`. You can also edit the manifest by hand.
- Files without `meta` and a `questions` array are ignored, and `meta.config.active: false` hides a test.

## Finding tests

- **Filter:** the Filter button on the Test page opens a window with chips for Level, Course and Topic. Several chips in one group match any of them; chips from different groups combine (Easy + Math). Counts and available topics update as you choose; Apply saves it. Active filters show as removable chips next to the button.
- **Favorites:** tap the star on a test card to favorite it; the **Favorites** button shows only favorites. The Favorites view lists your favorites that still exist (the count on the button matches the list; the filters do not apply there). Favorites are saved per user in this browser.

## GenTest and MyTest

- **GenTest** (button on the Test page) builds a random test from all question files. Pick a course, then enter how many questions you want for each **level and topic** (the table shows how many exist in each cell). Questions are drawn at random without repeats and ordered easy to advanced, or shuffled if you tick the option.
- A preview lists the drawn questions. **Regenerate** draws again, **Back** changes the numbers, **Start test** opens the usual start dialog (pace, and the `configure_test` options if you have them), and **Save to MyTest** keeps it.
- **MyTest** (next to Favorites) lists your saved tests. Open one to take it again with the same questions, or delete it with the bin icon. Saved tests, like Favorites and results, live in this browser's storage for that user.
- Only files in `questions/<level>/<course>/<topic>/` are used. If a question or file is removed later, a saved test skips the missing questions and says so.
- Generated tests also appear in Reports, and Retake / Review work for them, even if you never saved them.

## Files (teaching materials)

- The **Files** menu lists everything under `files/`, laid out like `questions/`: `files/<level>/<course>/<file>` (an optional topic folder is allowed: `files/<level>/<course>/<topic>/<file>`). Use lowercase `easy` / `intermediate` / `advanced` for the level.
- Like the question files, the list comes from `manifests/files-manifest.json` (static hosting cannot list folders). After adding files, run `python3 scripts/build_manifest.py`, or let the GitHub Action do it on every push that touches `files/`. Entries can be plain paths or `{ "path": "...", "size": 1234, "title": "...", "description": "..." }`; `title` and `description` are optional (the title defaults to the file name).
- **Filter** (level, course, topic and file type) and a search box narrow the list. Each card has an **Open in new tab** icon, and the viewer has **Open in new tab** and **Download** buttons.
- **Preview:** PDF (embedded), images (jpg, png, gif, webp, svg...), Markdown (rendered), text-like files (txt, csv, json...), audio and video. Other types (docx, zip...) show a message with Open in new tab and Download.
- Markdown is rendered by a small built-in renderer (headings, lists, tables, quotes, code, links, images). File content is never inserted as HTML, so a hostile file cannot run scripts; only http, https and mailto links are kept, and links open in a new tab.
- Everything in `files/` is public on GitHub Pages. Do not put private material there. Very large files make the page heavy to open.

## Test screen

- Starting a test hides the top menu to leave more room. It returns when you submit, cancel (the **Cancel** button) or when time is up.
- Users with the `configure_test` special feature can randomize the questions and pick fewer questions in the start dialog. The timer is the total of the chosen questions (shown as an estimate when random).
- On the results and review screens, **Correct**, **Incorrect** and **Unanswered** are buttons that filter the list of reviewed questions.

## Questions with sound (listening)

A question can have a sound, played with a **Listen** button. Two keys in the question file switch it on:

```json
{
  "meta": { "title": "Listening: sample", "soundpath": "./qsound/easy/english/listening/sample/", ... },
  "questions": [
    { "id": 1, "type": "multiple_choice", "data": { "question": "What does she do every morning?", "sound": "q1.mp3" }, ... }
  ]
}
```

- The sound file is `meta.soundpath` + `data.sound`, here `./qsound/easy/english/listening/sample/q1.mp3`. Each question has its own file.
- If `meta.soundpath` is missing, or the question has no `data.sound`, the question is a regular one with no Listen button. You can mix both kinds in one test.
- Put the files in `qsound/` at the **root of the repository** (next to `questions/` and `files/`). The path is relative to the page, so it works at `https://user.github.io/` and at a project site such as `https://user.github.io/my-repo/`. File and folder names are case-sensitive on GitHub Pages, so `q1.mp3` and `Q1.mp3` are different files.
- Formats: **mp3, wav, ogg** (also oga, opus, m4a, aac, flac). The browser is asked whether it supports the format; if not, the button is disabled with a message. A missing file shows "The sound could not be loaded" and a Try again button, without revealing the path.
- The button shows Listen, Pause, Resume and Listen again, with a progress bar and the time. Only one sound plays at a time; moving to another question, pausing the test, submitting or leaving the page stops it. The player also appears in the results review, and generated tests (GenTest / MyTest) keep the sounds of the questions they use.
- `soundpath` may also be an `https://` address. Other protocols are ignored.
- `python3 scripts/build_manifest.py` prints a warning for every sound file that a question refers to but that is missing from the repository.
- Code: `assets/js/sound.js` is a reusable `SoundManager` (play / pause / stop / toggle, state events, one shared instance) built on the browser's `Audio` object.

## Show answer highlighting

With the `show_answer` special feature, **Show answer** colours the question: correct options turn green, a wrong choice turns red, error-correction parts that need a fix show the right text, and each text box you typed in turns green (right) or red (wrong, with the expected text). Colours follow the light and dark themes. For error-correction questions a **Hide wrong parts** button then removes the wrong text from the sentence, so the corrected sentence reads straight through (**Show wrong parts** brings it back). The sentence itself sits in a bordered panel.

## About page and contact details

The **About** menu shows the app's name, designer, version, description and feature list from `data/config.json` (`appName`, `designer`, `tagline`, `description`, `version`, `released`, `features`) and the contact card from `data/contact.json` (`name`, `title`, `message`, `email`, `phone`, `website`, `address`, `links`). Edit those two files to change the page. Only http(s) links and valid email addresses are shown; a missing contact file just hides the card. Nothing sensitive from `config.json` (such as the password salt) is displayed.

## Themes

The sun / moon button switches light and dark mode; the palette button opens a window with six accent themes (Teal, Ocean, Violet, Rose, Forest, Sunset). The choice is saved in this browser; the first visit follows the system light / dark setting. The refresh button next to them reloads the app (same as Ctrl+R) and keeps you signed in on the same page. Colors are CSS variables at the top of `assets/css/styles.css`; add a theme by adding a `data-accent` rule there and an entry in `ACCENTS` in `assets/js/theme.js`.

## Question file format

- `meta`: `title`, `description`, `info`, `author`, `created` (optional date such as `2026-11-19`, the manifest builder lists newer files first), `config` (`active`, `no_timer`, `show_answer`, `show_explanation`).
- `questions[]`: `id`, `type`, `data`, `explanation`, `config` (`level`, `show_answer`, `show_explanation`, `time_in_seconds`).
- **`multiple_choice`**: `options` keyed by letter; options with `"correct": true` are the answers. Two or more correct options turn the question into select-all (checkboxes). Scoring is all-or-nothing.
- **`correction`**: `multiErrorSegments`. The user clicks the clickable segments they think are wrong; a compact, lightly tinted text box (1.3rem text) opens for each one, pre-filled with the original text, to edit into the fix. "No error" is also available. A question is correct when the marked segments are exactly those with `isError: true` and every typed fix matches one of `correctAnswers` (case, spacing and edge punctuation ignored). With no `isError` segments, "No error" is the right answer.
- **Timer:** every test is timed (`meta.config.no_timer` is ignored). Clicking a test opens a dialog where the user picks a pace (`fast`, `normal`, `easy`); the total time is the sum of each question's `config.time_in_seconds[pace]`. A question without that value uses `defaultTimeInSeconds[pace]` from `data/config.json`. When time runs out the test is submitted automatically.
- **Feedback:** correct answers and explanations appear in the results review. Question-level `show_answer` / `show_explanation` override the test-level values.
- Light HTML (`<b>`, `<br>`, `<i>`, lists) is allowed in text fields; everything else is stripped.

## Saving the login (less secure)

The sign-in page has a **Save username and password** checkbox. When it is ticked and you sign in, the username and password are stored in this browser's `localStorage`, **unencrypted**, and the next time the sign-in page opens (for example in a new tab) the fields are already filled in. Unticking the box removes the saved login at once. Anyone who can use that device can read it, so use it only on a device you trust. The sign-in itself still uses the normal rules (the session ends when the tab closes; failed attempts still lock the form).

## Users and roles

Users live in `data/users.json`; add a user by editing the file and pushing to GitHub:

```json
{ "username": "sam", "name": "Sam Multi", "email": "sam@example.com", "roles": ["editor", "auditor"], "active": true, "passwordHash": "<64 hex characters>" }
```

- `roles` is a list. A user's permissions are the union of the permissions of all their roles.
- Role names and their permissions are defined in `data/roles.json`. A role name not listed there grants nothing.
- Set `"active": false` to disable a user.

### Passwords

- `passwordHash` is the SHA-256 of `passwordSalt:username:password` as 64 hex characters. The salt is in `data/config.json`; the username is lowercase.
- **Generate a hash:** sign in as an admin and open the **Passwords** page (it runs in your browser and sends nothing anywhere), or run `python3 scripts/hash_password.py sam` (prompts for the password, so it stays out of your shell history).
- **A hash cannot be turned back into the password.** Hashing is one-way. To check a password, use "Check a password" on the Passwords page. To recover access, generate a new hash and replace the old one.
- Renaming a user or changing `passwordSalt` invalidates the hash; generate it again.
- Change `passwordSalt` before going live (then regenerate every hash).

Demo accounts:

| Username | Password  | Roles             |
|----------|-----------|-------------------|
| admin    | admin123  | admin             |
| editor   | editor123 | editor            |
| viewer   | viewer123 | viewer            |
| sam      | sam123    | editor + auditor  |
| teacher  | teacher123 | teacher          |
| student  | student123 | student          |

## Branding, home page and icons

- The logo is the cat icon plus `appName` and `designer` from `data/config.json` ("ZCat by Cheries"). It replaces the Overview menu item and links to the home page.
- The home page shows a welcome message, a **START TEST** button (opens the Test page), the 4 newest tests, the user's 3 latest attempts, and 3 motivational cards chosen from `motivation` in `config.json` (the selection rotates daily). Edit that list to change the sentences.
- "Newest questions" shows the first four tests listed in `manifests/questions-manifest.json`: the top of that list is the newest. `scripts/build_manifest.py` writes the list newest first (by `meta.created`, undated files last); if you edit the manifest by hand, put new tests at the top.
- Icons are [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache License 2.0), copied inline into `assets/js/icons.js`, so the app makes no extra network requests for them. The favicon is `assets/img/favicon.svg`.

## Permissions and special features

Set per role in `data/roles.json`; a user gets the union of all their roles.

```json
"editor": { "label": "Editor", "permissions": ["overview.view", "test.view", "reports.view"], "special": ["show_answer", "timer_disabler"] }
```

`permissions` control which pages a user can open:

| Permission | Allows |
|---|---|
| `overview.view`, `test.view`, `files.view`, `reports.view`, `users.view`, `settings.view`, `about.view` | Opening that page |
| `reports.all` | Reports lists every user's results (without it, only your own) |
| `passwords.tool` | The Passwords page |

`special` features add abilities while a test is running:

| Special feature | Allows |
|---|---|
| `show_answer` | A **Show answer** button (toggles; hidden again when you change question) |
| `show_explanation` | An **Explanation** button (opens a modal) |
| `timer_disabler` | **Pause / Resume** and **Disable timer / Enable timer** buttons |
| `configure_test` | In the test dialog: **Randomize questions** and **Number of questions** (up to the size of the test) |
| `show_waiting` | In the test dialog: **Waiting time** (seconds). After you click Next, a waiting dialog with an animation shows before the next question; the test timer stands still meanwhile. 0 = off |

The `show_answer` / `show_explanation` flags inside question files only decide what the review after the test shows. Answers and explanations viewed during a test, and pausing or disabling the timer, are recorded and shown in Reports; they do not change the score.

## Reports

Each finished test is saved as an attempt in this browser's `localStorage` (the app has no server, so nothing is uploaded). Reports lists the attempts made in this browser: your own, or everyone's with `reports.all`. The newest 500 are kept. Results from other devices or browsers cannot appear here.

The **User** (with `reports.all`) and **Test** filters sit above the table. Each row has **Retake** (opens that test's start page) and **Review** (shows the answers given in that attempt). Review is not available for results saved before this feature existed, or when the test's questions have changed since the attempt.

## Dialogs

Notices, errors and confirmations are in-page modal dialogs (`assets/js/modal.js`). The one native prompt left is the browser's "Leave site?" warning if you close or reload the tab during a test; browsers do not let pages restyle it.

## Run locally

`fetch()` and ES modules need a web server (not `file://`):

```
python3 -m http.server 8000
```

## Deploy to GitHub Pages

Push to a repo, then Settings → Pages → Deploy from a branch → `main` / root. All paths are relative, so project sites under `/<repo>/` work.

## Security note

This is static hosting: every JSON file, including question files with their correct answers, is publicly downloadable. The login controls what the interface shows but cannot protect secrets. Do not use it for high-stakes exams or private data.

Passwords are stored as salted SHA-256 hashes. That hides them from casual reading, but SHA-256 is fast, and `users.json` is public, so anyone can try guesses offline. Use long, unique passwords.
