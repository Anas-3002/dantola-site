#!/usr/bin/env python3
"""Assemble the Dantola static site.

Sources of truth
  src/partials/head.html    document head, carries {{TITLE}} {{DESC}} {{CANONICAL}}
                            {{ROBOTS}} {{EXTRA_HEAD}} {{V_CSS}} {{V_JS}}
  src/partials/header.html  fixed header + mobile drawer (nav links carry data-path)
  src/partials/footer.html  footer, floating actions, booking tray, toast host
  src/pages/<page>.html     the <main> content of one page

Output: index.html, services.html, about.html, contact.html, 404.html in the repo
root plus sitemap.xml. Running it twice produces identical output.

The active nav item is marked from the page key, never by hand, so the four pages
cannot drift apart. Stylesheet and script references carry a content hash so a
deploy cannot ship a stale cached asset.
"""
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
TOKEN = "__SITE_URL__"

# key -> (output file, <title>, meta description, canonical path, robots, nav key, extra head)
PAGES = [
    (
        "home", "index.html",
        "Dantola Dental Clinic &mdash; Precision Dentistry in Karachi",
        "Dantola Dental Clinic in DHA Phase 6, Karachi: digital scanning, guided dental "
        "implants, smile design, orthodontics and 24/7 emergency dental care. Book an "
        "appointment on WhatsApp in under a minute.",
        "", "index,follow", "home",
        """<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": "Dantola Dental Clinic",
    "url": "__SITE_URL__/",
    "image": "__SITE_URL__/assets/img/og-image.jpg",
    "telephone": "+92 313 5524592",
    "email": "hello@dantola.com",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "3rd Floor, Ocean Tower, Plot 12-A, Khayaban-e-Iqbal, DHA Phase 6",
      "addressLocality": "Karachi",
      "addressRegion": "Sindh",
      "addressCountry": "PK"
    },
    "areaServed": "Karachi",
    "medicalSpecialty": ["Dentistry", "Orthodontic", "Prosthodontics", "Endodontics"],
    "openingHoursSpecification": [
      {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "10:00", "closes": "21:00"},
      {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "18:00"},
      {"@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "12:00", "closes": "18:00"}
    ]
  }
</script>""",
    ),
    (
        "services", "services.html",
        "Dental Services &amp; Treatments in Karachi &mdash; Dantola Dental Clinic",
        "General and preventive dentistry, dental implants, cosmetic smile design, "
        "orthodontics, root canal therapy, children's dentistry and 24/7 emergency dental "
        "care in DHA Phase 6, Karachi.",
        "services.html", "index,follow", "services",
        """<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "__SITE_URL__/"},
      {"@type": "ListItem", "position": 2, "name": "Services", "item": "__SITE_URL__/services.html"}
    ]
  }
</script>""",
    ),
    (
        "about", "about.html",
        "About Dantola Dental Clinic &mdash; Clinicians, Technology &amp; Standards",
        "Meet the clinicians who treat you at Dantola Dental Clinic, see the imaging and "
        "sterilisation standards we publish, and read the four commitments behind every "
        "treatment plan.",
        "about.html", "index,follow", "about",
        """<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "__SITE_URL__/"},
      {"@type": "ListItem", "position": 2, "name": "About", "item": "__SITE_URL__/about.html"}
    ]
  }
</script>""",
    ),
    (
        "contact", "contact.html",
        "Book a Dental Appointment in Karachi &mdash; Contact Dantola",
        "Book a dental appointment at Dantola Dental Clinic, DHA Phase 6, Karachi. Call "
        "+92 313 5524592, message us on WhatsApp, request a callback or get directions to "
        "the clinic.",
        "contact.html", "index,follow", "contact",
        """<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "url": "__SITE_URL__/contact.html",
    "name": "Contact Dantola Dental Clinic",
    "mainEntity": {
      "@type": "Dentist",
      "name": "Dantola Dental Clinic",
      "telephone": "+92 313 5524592",
      "email": "hello@dantola.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "3rd Floor, Ocean Tower, Plot 12-A, Khayaban-e-Iqbal, DHA Phase 6",
        "addressLocality": "Karachi",
        "addressRegion": "Sindh",
        "addressCountry": "PK"
      }
    }
  }
</script>""",
    ),
    (
        "404", "404.html",
        "Page not found &mdash; Dantola Dental Clinic",
        "The page you were looking for is not here. Jump back to the Dantola homepage, "
        "services, about or contact page.",
        "404.html", "noindex,follow", None, "",
    ),
]

SITEMAP = [("", "1.0", "weekly"), ("services.html", "0.9", "monthly"),
           ("about.html", "0.8", "monthly"), ("contact.html", "0.9", "monthly")]


def read(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as fh:
        return fh.read()


def asset_version(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return "0"
    with open(path, "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()[:10]


def mark_active(header, nav_key):
    """aria-current is derived from the page key so the four pages cannot drift."""
    if not nav_key:
        return header
    pattern = re.compile(r'(<a[^>]*data-path="' + re.escape(nav_key) + r'"[^>]*)(>)')

    def repl(match):
        tag, close = match.group(1), match.group(2)
        if "aria-current" in tag:
            return tag + close
        return tag + ' aria-current="page"' + close

    return pattern.sub(repl, header)


def build():
    head = read("partials/head.html")
    header = read("partials/header.html")
    footer = read("partials/footer.html")
    v_css = asset_version("assets/css/tailwind.css")
    v_js = asset_version("assets/js/site.js")

    written = []
    for key, out_name, title, desc, canonical, robots, nav_key, extra in PAGES:
        body = read(os.path.join("pages", key + ".html"))
        doc = head
        doc = doc.replace("{{TITLE}}", title)
        doc = doc.replace("{{DESC}}", desc)
        doc = doc.replace("{{CANONICAL}}", canonical)
        doc = doc.replace("{{ROBOTS}}", robots)
        doc = doc.replace("{{EXTRA_HEAD}}", extra)
        doc = doc.replace("{{V_CSS}}", v_css)
        doc = doc.replace("{{V_JS}}", v_js)
        doc = doc.replace("{{HEADER}}", mark_active(header, nav_key).rstrip())
        doc = doc.replace("{{BODY}}", body.rstrip())
        doc = doc.replace("{{FOOTER}}", footer.rstrip())
        with open(os.path.join(ROOT, out_name), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(doc + "\n")
        written.append(out_name)

    urls = "".join(
        "  <url>\n    <loc>%s/%s</loc>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n"
        % (TOKEN, path, freq, prio)
        for path, prio, freq in SITEMAP
    )
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                 + urls + "</urlset>\n")

    print("css version:", v_css, "js version:", v_js)
    for name in written:
        print("  wrote", name)
    print("  wrote sitemap.xml")


if __name__ == "__main__":
    build()
