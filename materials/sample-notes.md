# Sample Notes

## How this app works
- **No database.** All data lives in `data/`, `questions/` and `materials/` as JSON / MD / TXT / PDF / images.
- **GET only.** The app only uses `fetch()` GET to read JSON files. No POST.
- **To update:** edit a file locally, commit and push to GitHub. GitHub Pages serves the new version.

## Adding questions
Create `questions/your-topic.json` with the same shape as `sample.json`, then add it to `questions/index.json`.

## Adding materials
Put the file in `materials/` and add an entry to `data/materials.json` with `title`, `file`, `type` (`pdf`, `png`, `jpg`, `txt`, `md`).
