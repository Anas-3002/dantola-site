#!/usr/bin/env python3
"""Stamp the live domain into every file that carries an absolute URL.

Usage:  python tools/set-domain.py https://dantola.com

Every occurrence of the __SITE_URL__ token (canonical links, og:/twitter: tags,
JSON-LD, robots.txt, sitemap.xml) is rewritten. Idempotent: the current value is
kept in SITE-DOMAIN.txt, so re-running with the same domain changes nothing.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN = "__SITE_URL__"
STAMP = os.path.join(ROOT, "SITE-DOMAIN.txt")
FILES = [f for f in os.listdir(ROOT) if f.endswith((".html", ".txt", ".xml"))]

if len(sys.argv) != 2 or not re.match(r"^https?://[^/\s]+$", sys.argv[1]):
    sys.exit("usage: python tools/set-domain.py https://your-domain.tld")

domain = sys.argv[1].rstrip("/")
previous = open(STAMP).read().strip() if os.path.exists(STAMP) else TOKEN
changed = []
for rel in FILES:
    path = os.path.join(ROOT, rel)
    if rel == os.path.basename(STAMP) or not os.path.exists(path):
        continue
    with open(path, encoding="utf-8") as fh:
        body = fh.read()
    if previous not in body:
        continue
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(body.replace(previous, domain))
    changed.append(rel)

with open(STAMP, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(domain + "\n")

print("domain:", domain)
print("files updated:", len(changed))
for name in changed:
    print("  ", name)
leftover = [f for f in FILES if f != os.path.basename(STAMP)
            and os.path.exists(os.path.join(ROOT, f))
            and TOKEN in open(os.path.join(ROOT, f), encoding="utf-8").read()]
print("files still holding the token:", leftover)
