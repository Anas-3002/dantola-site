#!/usr/bin/env node
/* Screenshot the built site at desktop, tablet and mobile widths.
 *   node tools/shot.js [baseUrl] [outDir]
 * Useful for a quick human review of every page without a browser session. */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] || "http://127.0.0.1:8901").replace(/\/$/, "");
const OUT = path.resolve(process.argv[3] || path.join(__dirname, "..", "shots"));
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.CDP_PORT || 9444);
const PROFILE = path.join(process.env.LOCALAPPDATA || ".", "Temp", "dantola-shot-" + Date.now());

const PAGES = [["home", "/"], ["services", "/services.html"], ["about", "/about.html"],
               ["contact", "/contact.html"], ["404", "/404.html"]];
const VIEWS = [["desktop", 1440, 900], ["mobile", 390, 844]];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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
  return { ready, send, close: () => ws.close() };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + PORT,
    "--user-data-dir=" + PROFILE, "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

  let client = null;
  for (let i = 0; i < 40 && !client; i++) {
    await sleep(400);
    try {
      const info = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
      if (info.webSocketDebuggerUrl) {
        const c = cdp(info.webSocketDebuggerUrl); await c.ready; client = c;
      }
    } catch (e) {}
  }
  if (!client) { chrome.kill(); throw new Error("CDP never came up"); }

  for (const [name, url] of PAGES) {
    for (const [view, w, h] of VIEWS) {
      const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
      await client.send("Page.enable", {}, sessionId);
      await client.send("Emulation.setDeviceMetricsOverride",
        { width: w, height: h, deviceScaleFactor: 1, mobile: view === "mobile" }, sessionId);
      await client.send("Page.navigate", { url: BASE + url }, sessionId);
      for (let i = 0; i < 50; i++) {
        const r = await client.send("Runtime.evaluate",
          { expression: "document.readyState==='complete' && !!window.__dantolaReady", returnByValue: true }, sessionId);
        if (r.result && r.result.value) { break; }
        await sleep(200);
      }
      /* let fonts, reveals and lazy images settle */
      await sleep(1200);
      await client.send("Runtime.evaluate", {
        expression: "document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-visible'));" +
                    "window.scrollTo(0, document.body.scrollHeight);"
      }, sessionId);
      await sleep(900);
      await client.send("Runtime.evaluate", { expression: "window.scrollTo(0,0);" }, sessionId);
      await sleep(400);
      const shot = await client.send("Page.captureScreenshot",
        { format: "jpeg", quality: 78, captureBeyondViewport: true, optimizeForSpeed: false }, sessionId);
      const file = path.join(OUT, `${name}-${view}.jpg`);
      fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log("wrote", file, Math.round(Buffer.from(shot.data, "base64").length / 1024) + "KB");
      await client.send("Target.closeTarget", { targetId });
    }
  }
  client.close();
  chrome.kill();
})().catch((e) => { console.error("shot error:", e.message); process.exit(1); });
