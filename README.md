# XUV 7XO Studio — Amato Automotive × Mahindra

The XUV 7XO design-proposal page, with an admin that can copy the master template,
replace images and text, and share a link per customer. The UI/UX is the same as the original page.

## How it works

| URL | Who | What |
|---|---|---|
| `/` | anyone | Master template (read-only, from `public/default.json`) |
| `/admin/` | admin | Log in, see the master template, create / duplicate / delete proposals |
| `/admin/edit/<id>` | admin | Edit a proposal on the live page itself |
| `/p/<id>` | customers | The shareable, read-only proposal |

**In the editor:** click any text to edit · hover an image → *Replace image* / × ·
drag the numbered seat markers · click a colour chip (+ / × to add or remove) ·
click a logo to replace it · **Save** (or Ctrl/Cmd+S) · **Copy share link**.

The master template is never modified. Every proposal is a separate copy with its own link.
Uploaded images are resized and converted to WebP in the browser before upload.

## Netlify setup (one time)

1. **Link the repo:** Site configuration → Build & deploy → Link repository → choose this repo.
   Build settings come from `netlify.toml` (publish `public`, functions `netlify/functions`, no build command).
2. **Set the admin password:** Site configuration → Environment variables → add
   `ADMIN_PASSWORD` = your password. Optional: `SESSION_SECRET` = any long random string.
   (Changing either logs everyone out.)
3. Deploy. Open `/admin/` and log in.

Storage uses **Netlify Blobs** (built in; nothing to configure). Stores: `proposals`, `images`.

## Editing the master template

Edit `public/default.json` (text, image paths) or add images to `public/assets/xuv7xo/`, then push.
Existing proposals are copies, so they are not affected.

## Local development

```bash
npm install
echo "ADMIN_PASSWORD=test123" > .env
npx netlify dev        # http://localhost:8888
```

## Files

```
public/index.html        page shell (viewer + editor)
public/js/page.js        render engine: same markup as the original, driven by JSON
public/js/editor.js      in-place editor
public/js/admin-api.js   auth, API, image compression
public/admin/index.html  dashboard
public/css/site.css      original styles (unchanged)
public/css/editor.css    editor-only styles
public/default.json      master template content
netlify/functions/api.mjs  API (login, proposals, uploads) on Netlify Blobs
```

Optional: add the licensed **New Science** font files to `public/fonts/` and they load automatically
(otherwise it falls back to Michroma / Archivo / Inter, as before).
