# Northfield Console

Static login app for GitHub Pages: plain HTML, CSS and JavaScript, with users, roles and settings in JSON files.

## Structure

```
.
├── index.html              Login page
├── dashboard.html          Protected page
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── auth.js         Data loading, hashing, session, lockout, permissions
│       ├── login.js        Login page logic
│       └── dashboard.js    Dashboard, sections shown by role permissions
└── data/
    ├── config.json         App name, salt, session and lockout settings
    ├── roles.json          Roles and their permissions
    └── users.json          Users with salted SHA-256 password hashes
```

## Demo accounts

| Username | Password  | Role   |
|----------|-----------|--------|
| admin    | admin123  | admin  |
| editor   | editor123 | editor |
| viewer   | viewer123 | viewer |

## Data and requests

- No database: users, roles and settings live in `data/*.json`.
- GET only: the app's sole network calls are `fetch(..., { method: "GET" })` for those three files. There are no POST/PUT/DELETE requests and no forms that submit to a server.
- The app is read-only. To add or change users, roles or settings, edit the JSON files and push to GitHub.

## Run locally

`fetch()` and ES modules need a web server (not `file://`):

```
python3 -m http.server 8000
```

## Deploy to GitHub Pages

1. Push this folder's contents to a repository.
2. Settings → Pages → Deploy from a branch → `main` / root.
3. Open `https://<user>.github.io/<repo>/`.

All paths are relative, so project sites under `/<repo>/` work.

## Add a user

The hash is the SHA-256 of `passwordSalt` followed directly by the password:

```
printf '%s' "your-saltnewpassword" | sha256sum
```

Paste the result into `passwordHash` in `users.json`. If you change the salt in `config.json`, regenerate every hash.

## Security note

GitHub Pages is static hosting. The JSON files are publicly downloadable, so this login controls what the interface shows but cannot protect sensitive data. Do not put real secrets or private data in this repo. For real protection, use a backend or an auth provider.
