# Dantola Dental Clinic — static website

Four-page static site for **Dantola Dental Clinic** (dantola.com), built from the
"Vibrant Clinical Precision" design system. Plain HTML/CSS/JS — no server, no database,
no runtime framework. Every patient form delivers its contents to WhatsApp.

```
index.html      Home
services.html   Treatments & services (includes the interactive dental chart)
about.html      Clinicians, standards & technology
contact.html    Appointment request, callback request, map, directions
404.html        Not-found page (real page, wired to ErrorDocument)
```

## Verify the site is working

```bash
npm install          # once
npm run build        # compile CSS + assemble the HTML from src/
npm run serve        # http://127.0.0.1:8901
node tools/verify.js http://127.0.0.1:8901   # headless-Chrome acceptance run
```

`tools/verify.js` drives a real headless Chrome and fails the run on: JS errors, broken
images, horizontal overflow at 1440px **and** 390px, dead internal links (including
`#anchors` on other pages), a missing brand font or button gradient, a form that fails to
produce a `wa.me` URL containing every entered field, a blank form that is *not* blocked,
and any of the interactive parts (booking tray, drawer, accordion, filter, dental chart)
misbehaving.

## Editing content

| What | Where |
|------|-------|
| Phone, WhatsApp inbox, email, address, hours, social links | `assets/config.js` — served `no-cache`, goes live on refresh, **no rebuild needed** |
| Page copy and markup | `src/pages/*.html` (the `<main>` of each page) |
| Header, footer, booking tray, floating buttons | `src/partials/*.html` |
| Colours, type scale, radii, shadows | `tailwind.config.js` (one-to-one with the design token sheet) |
| Component classes (buttons, badges, cards, inputs, chart) | `assets/css/input.css` |

The four pages are assembled by `tools/build_site.py`, which also marks the active nav
item from the page key (so the pages cannot drift apart) and stamps a content hash onto
the CSS/JS references. Edit the files in `src/`, run `npm run build`, and the root HTML is
regenerated.

## Forms

Every form is a `form[data-wa-form]`. On submit the script validates required fields,
then composes a message from **every field the patient filled in** — the field's
`data-label` (or its `<label>`) becomes the line label — and opens
`https://wa.me/<number>?text=<message>`. There is no backend and no storage; a honeypot
field (`name="_hp"`) silently discards bot submissions. Adding a field to a form requires
no JavaScript change: give it a `name` and a `data-label` and it is included automatically.

## Deployment

See `DEPLOY.md`. In short: the repository root becomes `public_html`; `.htaccess` blocks
the repo's own sources and tooling, and clean URLs (`/services` → `services.html`) are
handled internally without a redirect loop.
