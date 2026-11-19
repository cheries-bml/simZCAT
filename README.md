# SimpleAuth v2.0.0

JSON-only login for GitHub Pages. No DB. GET only.

## Structure
```
├── index.html
├── assets/css/style.css
├── assets/js/app.js
├── data/config.json
├── data/roles.json
├── data/users.json
└── .nojekyll
```

## Demo
- admin / admin123
- manager / manager123
- staff / staff123

## Deploy
Push folder to GitHub → Settings → Pages → Branch: main / (root)

## Change version
Edit `data/config.json` → `version`. It shows in header, login card, and footer.

## Icons
Inline SVG icons, inspired by Lucide / Heroicons (ISC / MIT, free). No icon font needed.

## Note
Demo only. `users.json` is public — don't use real passwords.
