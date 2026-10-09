# Deploying Dantola to Hostinger (shared hosting / hPanel)

The repository **root** is the web root. Whatever is committed is web-reachable, so
`.htaccess` denies `src/`, `tools/`, `node_modules/`, dot-files and the config/docs files.

## 1. Stamp the live domain

Every canonical link, `og:` tag, JSON-LD block, `robots.txt` and `sitemap.xml` carries a
single token, `__SITE_URL__`:

```bash
python tools/set-domain.py https://dantola.com        # production
python tools/set-domain.py https://<temp>.hostingersite.com   # temporary preview domain
```

Idempotent — the current value is remembered in `SITE-DOMAIN.txt`, so re-running it with
the same domain changes nothing. It prints any file still holding the token (should be
none). Commit the result.

## 2. Build and commit

```bash
npm install
npm run build          # writes index/services/about/contact/404.html + sitemap.xml
node tools/verify.js http://127.0.0.1:8901   # after npm run serve, in a second shell
git add -A && git commit -m "Deploy <date>" && git push
```

Compiled assets **are** committed (`assets/css/tailwind.css`, `assets/js/*.js`); there is
no build step on the host.

## 3. hPanel (one-time, user)

1. **Websites → your site → Advanced → Git → Connect with GitHub** installs the Hostinger
   GitHub App. Private repos work (lock icon) — no deploy key or webhook needed.
2. Branch `main`, deploy directory `public_html`.
3. Delete Hostinger's placeholder files (`default.php`, stock `index.html`) from
   `public_html` before the first pull.
4. Turn on hPanel's **Force HTTPS** once SSL is issued. The `.htaccess` HTTPS redirect
   ships commented out on purpose: with both enabled, the classic symptom is a redirect
   loop behind a TLS-terminating proxy.

Auto-deploy is on by default, so every push to `main` goes live.

## 4. What to check after the first deploy

```bash
curl -sI https://dantola.com/            # 200, text/html
curl -sI https://dantola.com/services    # 200 (clean URL, served internally)
curl -sI https://dantola.com/src/pages/home.html   # 403 (repo source blocked)
curl -sI https://dantola.com/package.json          # 404
curl -s  https://dantola.com/robots.txt            # Sitemap points at the live domain
```

Then open the site and submit one form per page — WhatsApp should open with your details
already written out.

## 5. Rolling back

- Rename `.htaccess` → `.htaccess.off` (in `public_html` or via the file manager) and the
  site is immediately served with no rules at all. Use this if a 500 appears.
- `Options` and `Require all denied` are the usual 500 culprits; every module-specific
  block in the file is wrapped in `<IfModule>` for that reason.
- To roll back content, `git revert` the offending commit and push.

## 6. Caching

- HTML: `no-cache, must-revalidate` — a deploy is never hidden by the browser cache.
- CSS/JS: `immutable, 1 year`; the build appends `?v=<content hash>`, so a changed file
  gets a new URL and an unchanged one causes no churn.
- `assets/config.js`: `no-cache` on purpose — it is the edit-without-rebuild file.

## 7. If you move the site to another domain

Run `python tools/set-domain.py https://new-domain.tld`, rebuild, commit and push. Nothing
else in the repository is domain-specific.
