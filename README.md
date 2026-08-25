# Portfolio

A terminal / hacker-themed personal portfolio (cybersecurity + full-stack) with a
**local, file-backed admin dashboard**. Built with Node + Express + EJS.

All your content lives in a single human-readable file — [`content/portfolio.json`](content/portfolio.json) —
so every edit you make in the dashboard shows up as a change you can view, diff, and
commit to git. No database.

## Run it

```bash
npm install
npm start
```

Then open:

- **Portfolio:** http://localhost:3000
- **Dashboard:** http://localhost:3000/admin

Use `npm run dev` for auto-restart on file changes.

## Editing your info

Two ways, both edit the same `content/portfolio.json`:

1. **Dashboard (recommended)** — go to `/admin` and use the forms to edit text,
   add/edit/delete/reorder projects, certifications, and experience (per track),
   and upload your CV. Changes save instantly to the JSON file.
2. **By hand** — edit `content/portfolio.json` directly in your editor and refresh.

> The dashboard is a **local editing tool only** — it is **not served on the live site**.
> It is on by default when you run locally and automatically **off in production**
> (`NODE_ENV=production`), so `/admin` returns 404 on your deployed website and the
> footer "admin" link disappears. You edit at home, commit, and deploy a read-only site.

## Deploying (admin stays off)

Your content lives in `content/portfolio.json` and your CV in `uploads/cv.pdf` — both are
committed to git, so they ship with the site. To deploy:

1. Edit everything locally via `/admin` (or by hand), then commit the changed
   `content/portfolio.json` / `uploads/cv.pdf`.
2. Run the app on your host with **`NODE_ENV=production`**. That disables `/admin`
   automatically — the live site is just the portfolio + `/cv` download, no editor.

```bash
# on the server
NODE_ENV=production npm start
```

To update the live site later: edit locally → commit → redeploy. (The dashboard only
writes files on your machine; it never runs in production.)

## Your CV

Upload a PDF from the dashboard's **CV** section. It's stored at `uploads/cv.pdf`
(git-ignored) and served at `/cv`. The "Download CV" buttons appear on the site
only while a CV is present.

## Layout

```
content/portfolio.json   ← all editable content (tracked in git)
uploads/                 ← uploaded CV (git-ignored)
src/
  server.js              ← Express app
  store.js               ← reads/writes content/portfolio.json
  routes/
    public.js            ← the portfolio site + /cv download
    admin.js             ← the dashboard + save endpoints
  views/
    portfolio.ejs        ← the public page (the imported design)
    admin/dashboard.ejs  ← the editor UI
public/css/              ← styles (portfolio + admin)
```

## Hack The Box live sync

The portfolio can show a live **Hack The Box** section — your rank, points, user/system
owns, and recent owned machines — pulled straight from HTB and cached ~15 minutes.

1. In HTB: **Profile → App Tokens → Create App Token**.
2. Add it to `.env` (git-ignored):
   ```
   HTB_TOKEN=your-htb-app-token
   # optional; auto-detected from the token if omitted:
   HTB_USER_ID=123456
   ```
3. Restart. The `// hack the box` section appears automatically; edit its intro text
   from the dashboard (**content**), and force a refresh from the dashboard's **HTB** panel.

> HTB keeps *in-progress* machine state private, so this shows completed owns + overall
> stats (what HTB exposes), not a per-box "% done" feed.
> On your live host, set `HTB_TOKEN` as an environment variable there too.

### HTB Academy (manual)

Academy has no token-based public API (the App Token is Labs-only, and Academy is
session-cookie authenticated), so the **HTB Academy** section is maintained by hand in the
dashboard — it's just as easy to keep current:

- **content** tab → set the Academy intro, **tier**, **modules completed**, **cubes**, and an
  optional profile URL. Leave a stat blank to hide that tile.
- **certs** tab → the **htb academy** group: add your Academy certifications (CPTS, CBBH,
  CDSA, ...), using the credential field for status (e.g. "Certified" / "In progress").

The section appears on the site once you fill in any Academy stat or add an Academy cert.

## Config

Optional — copy `.env.example` to `.env`:

```
PORT=3000
# HTB_TOKEN=...        # enables the Hack The Box section
# ADMIN_ENABLED=true   # force the local dashboard on/off
```
