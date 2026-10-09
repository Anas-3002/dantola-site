#!/usr/bin/env node
/* Dantola - production-style verification against a real headless Chrome.
 *
 *   node tools/verify.js [baseUrl]        (default http://127.0.0.1:8901)
 *
 * Checks, per page: rendered DOM, JS errors, computed styles and fonts, broken
 * images, horizontal overflow at desktop AND mobile widths, internal link targets
 * (including #anchors), and that every form actually produces a wa.me URL carrying
 * every field the patient filled in. Then exercises the interactive parts: booking
 * tray, mobile drawer, FAQ accordion, treatment filter and the dental chart.
 *
 * Exits non-zero if any check fails.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE = (process.argv[2] || "http://127.0.0.1:8901").replace(/\/$/, "");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.CDP_PORT || 9333);
const PROFILE = path.join(process.env.LOCALAPPDATA || ".", "Temp", "dantola-cdp-" + Date.now());
const WA = "923135" + "524592";

const PAGES = ["/", "/services.html", "/about.html", "/contact.html", "/404.html"];
const failures = [];
const notes = [];

function fail(where, what) { failures.push(where + ": " + what); }
function ok(msg) { notes.push(msg); }

/* ---------------------------------------------------------------- CDP client */
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  const events = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });
  const send = (method, params, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {}, sessionId }));
  });
  return { ready, send, events, close: () => ws.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* one shared, long-lived session per page (fresh session = fresh cache each run) */
async function openePage(client, url) {
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: "window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));" +
            "window.addEventListener('unhandledrejection',e=>window.__errs.push('rejection:'+e.reason));"
  }, sessionId);
  const evaluated = await client.send("Runtime.evaluate", {
    expression: `(async () => { location.href = ${JSON.stringify(url)}; return true; })()`,
    awaitPromise: true, returnByValue: true
  }, sessionId);
  if (evaluated.exceptionDetails) { throw new Error("navigate failed"); }
  /* wait for our own boot flag, not for a network heuristic */
  for (let i = 0; i < 60; i++) {
    const probe = await client.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && !!window.__dantolaReady",
      returnByValue: true
    }, sessionId);
    if (probe.result && probe.result.value === true) { return sessionId; }
    await sleep(200);
  }
  throw new Error("page never booted: " + url + " (__dantolaReady never set)");
}

async function evaluate(client, sessionId, expression) {
  const res = await client.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true
  }, sessionId);
  if (res.exceptionDetails) {
    throw new Error("JS threw: " + JSON.stringify(res.exceptionDetails.exception && res.exceptionDetails.exception.description));
  }
  return res.result.value;
}

async function setViewport(client, sessionId, width, height, mobile) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: !!mobile
  }, sessionId);
}

/* -------------------------------------------------------------- http helpers */
function get(urlPath) {
  return new Promise((resolve) => {
    http.get(BASE + urlPath, (res) => {
      let body = "";
      res.on("data", (d) => { body += d; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", () => resolve({ status: 0, body: "" }));
  });
}

const PROBE = `(() => {
  const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
  const rect = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height)}; };
  return {
    title: document.title,
    lang: document.documentElement.lang,
    errors: window.__errs || [],
    h1: document.querySelectorAll('h1').length,
    h1text: document.querySelector('h1') ? document.querySelector('h1').innerText.replace(/\\s+/g,' ').trim() : null,
    activeNav: Array.from(document.querySelectorAll('nav a[aria-current="page"]')).map(a => a.getAttribute('data-path')),
    fontBody: cs('body', 'fontFamily'),
    btnBg: cs('.btn-primary', 'backgroundImage'),
    btnShadow: cs('.btn-primary', 'boxShadow'),
    cardShadow: cs('.card-l1', 'boxShadow'),
    radiusBtn: cs('.btn-primary', 'borderRadius'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyWidth: document.body.getBoundingClientRect().width,
    brokenImages: Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
    imageCount: document.images.length,
    links: Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')),
    forms: Array.from(document.querySelectorAll('form[data-wa-form]')).map(f => ({
      kind: f.getAttribute('data-wa-form'),
      fields: f.querySelectorAll('[name]').length
    })),
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).length,
    imgsLazy: Array.from(document.images).filter(i => i.loading === 'lazy').length
  };
})()`;

const FORM_TEST = (waTail) => `(() => {
  const form = document.querySelector('form[data-wa-form="' + ${JSON.stringify(waTail)} + '"]');
  if (!form) return { error: 'no form' };
  window.__lastOpen = null;
  window.open = (u) => { window.__lastOpen = u; return { closed: false, focus(){} }; };
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    if (!el) return;
    if (el.type === 'checkbox' || el.type === 'radio') { el.checked = true; }
    else { el.value = value; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('full_name', 'Verification Patient');
  set('phone', '03001234567');
  set('email', 'verify@example.com');
  set('service', form.querySelector('[name="service"]') ? form.querySelector('[name="service"]').options[1].value : '');
  set('preferred_date', '2026-11-03');
  set('preferred_time', form.querySelector('[name="preferred_time"]') ? form.querySelector('[name="preferred_time"]').options[2].value : '');
  set('clinic', form.querySelector('[name="clinic"]') ? form.querySelector('[name="clinic"]').options[0].value : '');
  set('notes', 'Sensitivity on the lower left molar for two weeks.');
  set('consent', true);
  set('patient_status', true);
  set('best_time', form.querySelector('[name="best_time"]') ? form.querySelector('[name="best_time"]').options[1].value : '');
  set('topic', 'Implant cost and staged payment');
  form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', {cancelable:true}));
  const url = window.__lastOpen || '';
  let text = '';
  try { text = decodeURIComponent(url.split('text=')[1] || ''); } catch (e) { text = '(undecodable)'; }
  const expected = ['Verification Patient', '03001234567', 'Sensitivity on the lower left molar', 'Consent to WhatsApp contact: Yes'];
  if (form.querySelector('[name="email"]')) { expected.push('verify@example.com'); }
  return {
    opened: !!url,
    host: url.split('?')[0],
    number: (url.match(/wa\\.me\\/(\\d+)/) || [])[1] || null,
    text: text,
    expected: expected,
    successVisible: !!document.querySelector('[data-form-success]:not(.hidden)'),
    reset: !form.querySelector('[name="full_name"]').value
  };
})()`;

const VALIDATION_TEST = `(() => {
  const form = document.querySelector('form[data-wa-form]');
  window.__lastOpen = null;
  window.open = (u) => { window.__lastOpen = u; return {}; };
  form.reset();
  form.querySelectorAll('[name="full_name"],[name="phone"]').forEach(el => { el.value = ''; });
  const hp = form.querySelector('[name="_hp"]');
  (form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit',{cancelable:true})));
  const invalid = form.querySelectorAll('.is-invalid').length;
  const shownErrors = form.querySelectorAll('.field-error.show').length;
  return { blockedBlankSubmit: !window.__lastOpen, invalidFields: invalid, shownErrors: shownErrors };
})()`;

const TRAY_TEST = `(async () => {
  const tray = document.getElementById('booking-tray');
  const trigger = document.querySelector('[data-open-tray]');
  trigger.click();
  await new Promise(r => setTimeout(r, 60));
  const opened = !tray.classList.contains('hidden');
  const focusIn = tray.contains(document.activeElement);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  const closed = tray.classList.contains('hidden');
  return { opened, focusIn, closed, ariaExpanded: trigger.getAttribute('aria-expanded') };
})()`;

const ACCORDION_TEST = `(async () => {
  const trigger = document.querySelector('[data-acc-trigger]');
  if (!trigger) return { skipped: true };
  trigger.click();
  /* the panel opens on a max-height transition, so sample it after it settles */
  await new Promise(r => setTimeout(r, 700));
  const panel = document.getElementById(trigger.getAttribute('aria-controls'));
  const open = trigger.getAttribute('aria-expanded') === 'true' && panel.classList.contains('is-open');
  const h = panel.getBoundingClientRect().height;
  const second = document.querySelectorAll('[data-acc-trigger]')[1];
  if (second) { second.click(); await new Promise(r => setTimeout(r, 700)); }
  return { open, panelHeight: Math.round(h), exclusive: second ? trigger.getAttribute('aria-expanded') === 'false' : null };
})()`;

const FILTER_TEST = `(async () => {
  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  if (!chips.length) return { skipped: true };
  const target = chips.find(c => c.getAttribute('data-filter') === 'cosmetic');
  target.click();
  await new Promise(r => setTimeout(r, 60));
  const cards = Array.from(document.querySelectorAll('[data-service-card]'));
  const visible = cards.filter(c => !c.classList.contains('hidden'));
  const allMatch = visible.every(c => (c.getAttribute('data-groups') || '').split(/\\s+/).includes('cosmetic'));
  const pressed = target.getAttribute('aria-pressed') === 'true';
  const onlyOnePressed = chips.filter(c => c.getAttribute('aria-pressed') === 'true').length === 1;
  chips.find(c => c.getAttribute('data-filter') === 'all').click();
  await new Promise(r => setTimeout(r, 60));
  const restored = cards.filter(c => !c.classList.contains('hidden')).length;
  return { visible: visible.length, allMatch, pressed, onlyOnePressed, restored, total: cards.length };
})()`;

const CHART_TEST = `(async () => {
  const chart = document.querySelector('[data-chart]');
  if (!chart) return { skipped: true };
  const readout = document.querySelector('[data-chart-readout]');
  const tooth = chart.querySelector('[data-tooth="47"]');
  tooth.click();
  await new Promise(r => setTimeout(r, 60));
  const selected = tooth.getAttribute('aria-pressed') === 'true';
  const text = readout.innerText.replace(/\\s+/g, ' ').trim();
  const onlyOne = Array.from(chart.querySelectorAll('[data-tooth]')).filter(t => t.getAttribute('aria-pressed') === 'true').length === 1;
  document.querySelector('[data-chart-reset]').click();
  await new Promise(r => setTimeout(r, 60));
  const cleared = Array.from(chart.querySelectorAll('[data-tooth]')).every(t => t.getAttribute('aria-pressed') === 'false');
  return { selected, onlyOne, cleared, readout: text.slice(0, 120), teeth: chart.querySelectorAll('[data-tooth]').length };
})()`;

const DRAWER_TEST = `(async () => {
  const drawer = document.querySelector('[data-drawer]');
  const toggle = document.querySelector('[data-drawer-toggle]');
  if (!drawer || !toggle) return { skipped: true };
  toggle.click();
  await new Promise(r => setTimeout(r, 80));
  const open = !drawer.classList.contains('hidden');
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  const linkCount = drawer.querySelectorAll('a[href]').length;
  toggle.click();
  await new Promise(r => setTimeout(r, 80));
  return { open, expanded, linkCount, closedAgain: drawer.classList.contains('hidden') };
})()`;

async function main() {
  if (!fs.existsSync(CHROME)) { throw new Error("Chrome not found: " + CHROME); }
  const chrome = spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--hide-scrollbars", "--force-device-scale-factor=1", "about:blank"
  ], { stdio: "ignore" });

  let client = null;
  for (let i = 0; i < 40 && !client; i++) {
    await sleep(400);
    try {
      const info = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
      if (info.webSocketDebuggerUrl) {
        const c = cdp(info.webSocketDebuggerUrl);
        await c.ready;
        client = c;
      }
    } catch (e) { /* not up yet */ }
  }
  if (!client) { chrome.kill(); throw new Error("headless Chrome never exposed CDP"); }

  const report = {};
  try {
    for (const page of PAGES) {
      const where = page;
      const sid = await openePage(client, BASE + page);
      report[page] = {};

      /* --- desktop render */
      await setViewport(client, sid, 1440, 1000, false);
      await sleep(120);
      const probe = await evaluate(client, sid, PROBE);
      report[page].desktop = probe;

      if (probe.errors.length) { fail(where, "JS errors on load: " + probe.errors.join(" | ")); }
      if (probe.overflow > 1) { fail(where, "horizontal overflow at 1440px: " + probe.overflow + "px"); }
      if (probe.brokenImages.length) { fail(where, "broken images: " + probe.brokenImages.join(", ")); }
      if (!/Plus Jakarta Sans/.test(probe.fontBody || "")) { fail(where, "brand font not applied: " + probe.fontBody); }
      if (!/gradient/.test(probe.btnBg || "")) { fail(where, "primary button is not the cyan gradient: " + probe.btnBg); }
      if (probe.h1 !== 1) { fail(where, "expected exactly one h1, found " + probe.h1); }

      /* --- mobile render */
      await setViewport(client, sid, 390, 844, true);
      await sleep(150);
      const mobile = await evaluate(client, sid, PROBE);
      report[page].mobile = {
        overflow: mobile.overflow, brokenImages: mobile.brokenImages.length,
        h1: mobile.h1, errors: mobile.errors.length
      };
      if (mobile.overflow > 1) { fail(where, "horizontal overflow at 390px: " + mobile.overflow + "px"); }
      if (mobile.brokenImages.length) { fail(where, "broken images on mobile"); }
      if (mobile.errors.length) { fail(where, "JS errors on mobile: " + mobile.errors.join(" | ")); }

      /* --- link targets, including #anchors in other pages */
      const bad = [];
      const seen = new Set();
      for (const href of probe.links) {
        if (!href || seen.has(href)) { continue; }
        seen.add(href);
        if (/^(https?:|mailto:|tel:|#)/.test(href)) { continue; }
        const [file, hash] = href.split("#");
        const target = file.startsWith("/") ? file : (page === "/" ? "/" + file : "/" + file);
        const res = await get(target);
        if (res.status !== 200) { bad.push(href + " -> HTTP " + res.status); continue; }
        if (hash && res.body.indexOf('id="' + hash + '"') === -1) { bad.push(href + " -> #" + hash + " missing"); }
      }
      report[page].linksChecked = seen.size;
      if (bad.length) { fail(where, "dead links: " + bad.join(", ")); }

      /* --- forms */
      await setViewport(client, sid, 1440, 1000, false);
      const kinds = probe.forms.map((f) => f.kind);
      if (kinds.length) {
        const primary = kinds[0];
        const formResult = await evaluate(client, sid, FORM_TEST(primary));
        report[page].form = formResult;
        if (!formResult.opened) { fail(where, "form did not open WhatsApp"); }
        else {
          if (formResult.number !== WA) { fail(where, "wrong WhatsApp number: " + formResult.number); }
          for (const needle of formResult.expected) {
            if (formResult.text.indexOf(needle) === -1) { fail(where, "form payload missing: " + needle); }
          }
          if (!formResult.successVisible) { fail(where, "success panel not revealed after submit"); }
          if (!formResult.reset) { fail(where, "form was not cleared after submit"); }
        }
        const validation = await evaluate(client, sid, VALIDATION_TEST);
        report[page].validation = validation;
        if (!validation.blockedBlankSubmit) { fail(where, "blank form still opened WhatsApp"); }
        if (validation.invalidFields === 0) { fail(where, "invalid fields not highlighted"); }
      }

      /* --- interactive parts, on the pages that have them */
      if (page !== "/404.html") {
        const tray = await evaluate(client, sid, TRAY_TEST);
        report[page].tray = tray;
        if (!tray.opened || !tray.closed || !tray.focusIn) { fail(where, "booking tray open/focus/close: " + JSON.stringify(tray)); }

        const acc = await evaluate(client, sid, ACCORDION_TEST);
        report[page].accordion = acc;
        if (!acc.skipped && (!acc.open || acc.panelHeight < 20)) { fail(where, "FAQ accordion did not open: " + JSON.stringify(acc)); }
        if (!acc.skipped && acc.exclusive === false) { fail(where, "accordion is not exclusive"); }

        const filt = await evaluate(client, sid, FILTER_TEST);
        report[page].filter = filt;
        if (!filt.skipped) {
          if (!filt.allMatch || !filt.pressed || !filt.onlyOnePressed) { fail(where, "service filter wrong: " + JSON.stringify(filt)); }
          if (filt.restored !== filt.total) { fail(where, "filter reset left cards hidden"); }
        }

        const chart = await evaluate(client, sid, CHART_TEST);
        report[page].chart = chart;
        if (!chart.skipped && (!chart.selected || !chart.onlyOne || !chart.cleared || chart.readout.indexOf("Tooth 47") === -1)) {
          fail(where, "dental chart wrong: " + JSON.stringify(chart));
        }

        await setViewport(client, sid, 390, 844, true);
        await sleep(120);
        const drawer = await evaluate(client, sid, DRAWER_TEST);
        report[page].drawer = drawer;
        if (!drawer.skipped && (!drawer.open || !drawer.expanded || !drawer.closedAgain)) {
          fail(where, "mobile drawer wrong: " + JSON.stringify(drawer));
        }
      }
    }
  } finally {
    try { client.close(); } catch (e) {}
    chrome.kill();
  }

  console.log(JSON.stringify(report, null, 2));
  console.log("\n================ SUMMARY ================");
  notes.forEach((n) => console.log("note:", n));
  if (failures.length) {
    console.log("FAILURES (" + failures.length + "):");
    failures.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("ALL CHECKS PASSED for " + BASE);
}

main().catch((e) => { console.error("harness error:", e.message); process.exit(2); });
