/* ============================================================================
   Dantola Dental Clinic - interactions, and the WhatsApp delivery layer.

   The site is static, so every patient form is delivered by handing the composed
   message to WhatsApp. Nothing is posted to a server, nothing is stored.

   Sections
     1. config + link hydration        6. service filter
     2. header / nav / drawer          7. interactive dental chart
     3. scroll reveal + counters       8. booking tray (modal)
     4. FAQ accordion                  9. every form -> WhatsApp
     5. back-to-top                   10. toast + year
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- 1. config */
  /* The inbox is assembled from two parts so no build step can mask it. */
  var DEFAULTS = {
    whatsapp: "923135" + "524592",
    phone: "+92 313 5524592",
    phoneDial: "+923135524592",
    email: "hello@dantola.com",
    clinic: "Dantola Dental Clinic",
    addressShort: "Ocean Tower, DHA Phase 6, Karachi",
    address: "Dantola Dental Clinic, 3rd Floor, Ocean Tower, Plot 12-A, Khayaban-e-Iqbal, DHA Phase 6, Karachi, Pakistan",
    mapsQuery: "Ocean Tower, Khayaban-e-Iqbal, DHA Phase 6, Karachi",
    hours: [
      { days: "Monday - Friday", time: "10:00 - 21:00" },
      { days: "Saturday", time: "10:00 - 18:00" },
      { days: "Sunday", time: "12:00 - 18:00" },
      { days: "Emergency care", time: "24/7 on call" }
    ],
    social: { facebook: "", instagram: "", linkedin: "", youtube: "" }
  };

  var CFG = Object.assign({}, DEFAULTS, window.DANTOLA_CONFIG || {});
  CFG.whatsapp = String(CFG.whatsapp || DEFAULTS.whatsapp).replace(/\D/g, "");
  CFG.social = Object.assign({}, DEFAULTS.social, CFG.social || {});

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function waLink(text) {
    return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text);
  }

  function openExternal(url) {
    var win = null;
    try { win = window.open(url, "_blank", "noopener"); } catch (e) { win = null; }
    if (!win) { window.location.href = url; }
    return url;
  }

  function text(el, value) { if (el) { el.textContent = value; } }

  function hydrateConfig() {
    $$("[data-cfg]").forEach(function (el) {
      var key = el.getAttribute("data-cfg");
      var val = CFG[key];
      if (typeof val === "string" && val) { text(el, val); }
    });
    $$("[data-cfg-attr]").forEach(function (el) {
      /* format:  data-cfg-attr="href:wa"  |  "href:tel"  |  "href:mail"  |  "src:maps" */
      var parts = el.getAttribute("data-cfg-attr").split(":");
      var attr = parts[0], kind = parts[1], href;
      if (kind === "wa") {
        href = waLink(el.getAttribute("data-wa-text") || "Hello Dantola, I would like to book an appointment.");
      } else if (kind === "tel") {
        href = "tel:" + CFG.phoneDial;
      } else if (kind === "mail") {
        href = "mailto:" + CFG.email;
      } else if (kind === "maps") {
        href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CFG.mapsQuery);
      } else {
        return;
      }
      el.setAttribute(attr, href);
    });
    $$("[data-cfg-map]").forEach(function (el) {
      el.setAttribute("src", "https://www.google.com/maps?q=" + encodeURIComponent(CFG.mapsQuery) + "&output=embed");
    });

    /* opening hours */
    $$("[data-hours]").forEach(function (host) {
      host.innerHTML = CFG.hours.map(function (row) {
        return '<li class="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 last:border-0">' +
          '<span class="text-body-sm text-inverse-on-surface/75">' + row.days + "</span>" +
          '<span class="text-body-sm font-bold text-secondary-fixed">' + row.time + "</span></li>";
      }).join("");
    });
    $$("[data-hours-light]").forEach(function (host) {
      host.innerHTML = CFG.hours.map(function (row) {
        return '<li class="flex items-center justify-between gap-4 border-b border-brand-slate py-2.5 last:border-0">' +
          '<span class="text-body-sm text-on-surface-variant">' + row.days + "</span>" +
          '<span class="text-body-sm font-bold text-brand-navy">' + row.time + "</span></li>";
      }).join("");
    });

    /* hide any social network that has no profile configured: no dead links */
    ["facebook", "instagram", "linkedin", "youtube"].forEach(function (net) {
      var url = CFG.social[net];
      var live = typeof url === "string" && url.trim() && url.trim() !== "#";
      $$('[data-social="' + net + '"]').forEach(function (el) {
        if (live) { el.setAttribute("href", url.trim()); } else { el.remove(); }
      });
    });
  }

  /* ------------------------------------------------- 2. header, nav, drawer */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) { return; }
    var solid = function () { header.classList.toggle("is-stuck", window.scrollY > 24); };
    solid();
    window.addEventListener("scroll", solid, { passive: true });
  }

  function initDrawer() {
    var drawer = $("[data-drawer]");
    var toggles = $$("[data-drawer-toggle]");
    if (!drawer || !toggles.length) { return; }

    var setOpen = function (open) {
      drawer.classList.toggle("hidden", !open);
      toggles.forEach(function (t) { t.setAttribute("aria-expanded", open ? "true" : "false"); });
      document.documentElement.style.overflow = open ? "hidden" : "";
      var first = drawer.querySelector("a, button");
      if (open && first) { first.focus(); }
    };
    toggles.forEach(function (t) {
      t.addEventListener("click", function () {
        setOpen(drawer.classList.contains("hidden"));
      });
    });
    $$("a", drawer).forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !drawer.classList.contains("hidden")) { setOpen(false); }
    });
  }

  /* ----------------------------------------- 3. reveal on scroll + counters */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) { return; }
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
        window.setTimeout(function () { el.classList.add("is-visible"); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initCounters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) { return; }
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var start = performance.now();
      var dur = 1500;
      var tick = function (now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = target * eased;
        el.textContent = prefix + value.toLocaleString("en-US", {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals
        }) + suffix;
        if (p < 1) { requestAnimationFrame(tick); }
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------ 4. FAQ accordion */
  function initAccordions() {
    $$("[data-accordion]").forEach(function (root) {
      $$("button[data-acc-trigger]", root).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var panel = document.getElementById(btn.getAttribute("aria-controls"));
          var open = btn.getAttribute("aria-expanded") === "true";
          $$("button[data-acc-trigger]", root).forEach(function (other) {
            if (other === btn) { return; }
            other.setAttribute("aria-expanded", "false");
            var p = document.getElementById(other.getAttribute("aria-controls"));
            if (p) { p.classList.remove("is-open"); }
          });
          btn.setAttribute("aria-expanded", open ? "false" : "true");
          if (panel) { panel.classList.toggle("is-open", !open); }
        });
      });
    });
  }

  /* ------------------------------------------------------- 5. back to top */
  function initBackToTop() {
    var btn = $("[data-back-to-top]");
    if (!btn) { return; }
    var sync = function () {
      var show = window.scrollY > 700;
      btn.classList.toggle("opacity-0", !show);
      btn.classList.toggle("pointer-events-none", !show);
      btn.classList.toggle("translate-y-3", !show);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ----------------------------------------------------- 6. service filter */
  function initFilters() {
    var chips = $$("[data-filter]");
    if (!chips.length) { return; }
    var cards = $$("[data-service-card]");
    var empty = $("[data-filter-empty]");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        var shown = 0;
        cards.forEach(function (card) {
          var groups = (card.getAttribute("data-groups") || "").split(/\s+/);
          var match = key === "all" || groups.indexOf(key) > -1;
          card.classList.toggle("hidden", !match);
          if (match) { shown++; }
        });
        if (empty) { empty.classList.toggle("hidden", shown > 0); }
      });
    });
  }

  /* ------------------------------------------------ 7. dental chart (tooth) */
  var TOOTH_NOTES = {
    clean: "Healthy enamel, no treatment indicated. Reviewed at your last visit.",
    action: "Watch-and-treat: early demineralisation or a shallow cavity. A same-week "
      + "appointment is recommended while the enamel is still repairable.",
    urgent: "Urgent: active decay, fracture or infection. Contact the clinic today so we "
      + "can open an emergency slot."
  };

  function initChart() {
    var chart = $("[data-chart]");
    if (!chart) { return; }
    var readout = $("[data-chart-readout]");
    var reset = $("[data-chart-reset]");

    var select = function (tooth) {
      $$("[data-tooth]", chart).forEach(function (t) {
        t.setAttribute("aria-pressed", t === tooth ? "true" : "false");
      });
      if (!readout) { return; }
      var no = tooth.getAttribute("data-tooth");
      var arch = tooth.getAttribute("data-arch") || "";
      var state = tooth.getAttribute("data-state") || "clean";
      var label = { clean: "Healthy", action: "Action required", urgent: "Urgent treatment" }[state] || state;
      var tone = { clean: "badge-clean", action: "badge-amber", urgent: "badge-urgent" }[state] || "badge-specialty";
      readout.innerHTML =
        '<div class="flex flex-wrap items-center gap-3">' +
        '<span class="text-headline-md font-bold text-brand-navy">Tooth ' + no + "</span>" +
        '<span class="' + tone + '">' + label + "</span>" +
        (arch ? '<span class="text-label-md font-bold uppercase tracking-[0.03em] text-on-surface-variant">' + arch + "</span>" : "") +
        "</div>" +
        '<p class="mt-3 text-body-sm text-on-surface-variant">' + TOOTH_NOTES[state] + "</p>";
    };

    $$("[data-tooth]", chart).forEach(function (tooth) {
      tooth.addEventListener("click", function () { select(tooth); });
    });
    if (reset) {
      reset.addEventListener("click", function () {
        $$("[data-tooth]", chart).forEach(function (t) { t.setAttribute("aria-pressed", "false"); });
        if (readout) {
          readout.innerHTML = '<p class="text-body-sm text-on-surface-variant">Select any tooth on the '
            + "chart to read its clinical status. Colour codes follow the Dantola hygiene notation "
            + "used at your in-chair review.</p>";
        }
      });
    }
  }

  /* ------------------------------------------------------- 8. booking tray */
  function initTray() {
    var tray = $("[data-tray]");
    if (!tray) { return; }
    var panel = $("[data-tray-panel]", tray);
    var lastFocus = null;

    var focusable = function () {
      return $$('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null; });
    };

    var setOpen = function (open) {
      tray.classList.toggle("hidden", !open);
      document.documentElement.style.overflow = open ? "hidden" : "";
      $$("[data-open-tray]").forEach(function (b) { b.setAttribute("aria-expanded", open ? "true" : "false"); });
      if (open) {
        lastFocus = document.activeElement;
        var first = focusable()[0];
        if (first) { first.focus(); }
        if (history.replaceState) { history.replaceState(null, "", "#book"); }
      } else {
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
        if (history.replaceState && location.hash === "#book") {
          history.replaceState(null, "", location.pathname + location.search);
        }
      }
    };

    $$("[data-open-tray]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); setOpen(true); });
    });
    $$("[data-close-tray]", tray).forEach(function (b) {
      b.addEventListener("click", function () { setOpen(false); });
    });
    tray.addEventListener("click", function (e) { if (e.target === tray) { setOpen(false); } });
    document.addEventListener("keydown", function (e) {
      if (tray.classList.contains("hidden")) { return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") { return; }
      var items = focusable();
      if (!items.length) { return; }
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    if (location.hash === "#book") { setOpen(true); }
  }

  /* -------------------------------------------- 9. every form -> WhatsApp */
  var SUCCESS_COPY = {
    appointment: "Opening WhatsApp with your appointment request. Press send in WhatsApp to confirm it with our front desk.",
    callback: "Opening WhatsApp with your callback request. Press send and we will ring you back shortly.",
    contact: "Opening WhatsApp with your message. Press send and our team will reply shortly."
  };

  function valueOf(el) {
    return String(el.value || "").replace(/\s+/g, " ").trim();
  }

  function fieldLabel(el) {
    if (el.getAttribute("data-label")) { return el.getAttribute("data-label"); }
    if (el.id) {
      var lab = document.querySelector('label[for="' + el.id + '"]');
      if (lab) { return lab.textContent.replace(/\s+/g, " ").trim(); }
    }
    var wrapLab = el.closest("label");
    if (wrapLab) { return wrapLab.textContent.replace(/\s+/g, " ").trim().slice(0, 60); }
    return el.getAttribute("name");
  }

  /* every field the patient filled in is serialised - nothing is dropped */
  function compose(form) {
    var kind = form.getAttribute("data-wa-form") || "contact";
    var subject = {
      appointment: "New Appointment Request",
      callback: "New Callback Request",
      contact: "New Website Enquiry"
    }[kind] || "New Website Enquiry";

    var rows = [];
    var radios = {};
    $$("[name]", form).forEach(function (el) {
      var name = el.getAttribute("name");
      if (!name || name.charAt(0) === "_" || el.type === "submit" || el.type === "button" || el.disabled) { return; }

      if (el.type === "radio") {
        if (!radios[name]) { radios[name] = null; }
        if (el.checked) { radios[name] = valueOf(el); }
        return;
      }
      if (el.type === "checkbox") {
        /* each ticked box is its own line, so multi-select answers all survive */
        if (el.checked) { rows.push({ label: fieldLabel(el), value: "Yes" }); }
        return;
      }
      var value = valueOf(el);
      if (value) { rows.push({ label: fieldLabel(el), value: value }); }
    });

    Object.keys(radios).forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]:checked');
      if (el && radios[name]) { rows.push({ label: fieldLabel(el), value: radios[name] }); }
    });

    var lines = ["\uD83E\uDDB7 *" + subject + " \u2014 " + CFG.clinic + "*", ""];
    rows.forEach(function (row) { lines.push(row.label + ": " + row.value); });
    lines.push("");
    lines.push("Submitted from: " + document.title);
    lines.push("Page: " + location.href);
    return lines.join("\n");
  }

  function validate(form) {
    var ok = true;
    $$("[data-validate], [required]", form).forEach(function (el) {
      var wrap = el.closest("[data-field]") || el.parentElement;
      var err = wrap ? wrap.querySelector(".field-error") : null;
      var value = valueOf(el);
      var rule = el.getAttribute("data-validate") || "";
      var bad = false;

      if (el.hasAttribute("required") && el.type !== "checkbox" && !value) { bad = true; }
      if (!bad && value && rule.indexOf("phone") > -1) {
        var digits = value.replace(/\D/g, "");
        if (digits.length < 9 || digits.length > 15) { bad = true; }
      }
      if (!bad && value && rule.indexOf("email") > -1) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { bad = true; }
      }
      el.classList.toggle("is-invalid", bad);
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (err) { err.classList.toggle("show", bad); }
      if (bad) { ok = false; }
    });
    return ok;
  }

  function toast(message) {
    var host = $("[data-toast-host]");
    if (!host) { return; }
    host.innerHTML =
      '<div class="glass flex max-w-[92vw] items-start gap-3 rounded-full px-5 py-3 sm:max-w-md">' +
      '<span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-mintwash text-[13px] text-brand-mintdeep">\u2713</span>' +
      '<p class="text-body-sm font-semibold text-brand-navy">' + message + "</p></div>";
    host.classList.remove("hidden");
    host.classList.add("flex");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () {
      host.classList.add("hidden");
      host.classList.remove("flex");
    }, 7000);
  }

  function initForms() {
    $$("[data-wa-form]").forEach(function (form) {
      /* honeypot: a filled hidden field means a bot, so silently refuse */
      var hp = form.querySelector('[name="_hp"]');

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var kind = form.getAttribute("data-wa-form") || "contact";
        if (hp && valueOf(hp)) { return; }
        if (!validate(form)) {
          var firstBad = form.querySelector(".is-invalid");
          if (firstBad) { firstBad.focus(); }
          toast("Please check the highlighted fields.");
          return;
        }
        var message = compose(form);
        openExternal(waLink(message));
        form.reset();

        var panel = form.querySelector("[data-form-success]") || document.getElementById(form.getAttribute("data-success"));
        if (panel) {
          var line = panel.querySelector("[data-success-copy]");
          if (line) { line.textContent = SUCCESS_COPY[kind] || SUCCESS_COPY.contact; }
          panel.classList.remove("hidden");
          panel.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          toast(SUCCESS_COPY[kind] || SUCCESS_COPY.contact);
        }
      });

      $$("[data-validate]", form).forEach(function (el) {
        el.addEventListener("input", function () {
          if (!el.classList.contains("is-invalid")) { return; }
          var wrap = el.closest("[data-field]") || el.parentElement;
          var err = wrap ? wrap.querySelector(".field-error") : null;
          el.classList.remove("is-invalid");
          el.setAttribute("aria-invalid", "false");
          if (err) { err.classList.remove("show"); }
        });
      });
    });

    /* preferred-date inputs default to today and cannot be set in the past */
    var today = new Date().toISOString().slice(0, 10);
    $$('input[type="date"]').forEach(function (el) {
      el.setAttribute("min", today);
      if (el.hasAttribute("data-default-today") && !el.value) { el.value = today; }
    });
  }

  /* --------------------------------------------------------- 10. boot glue */
  function initYear() {
    $$("[data-year]").forEach(function (el) { text(el, String(new Date().getFullYear())); });
  }

  function init() {
    hydrateConfig();
    initHeader();
    initDrawer();
    initReveal();
    initCounters();
    initAccordions();
    initBackToTop();
    initFilters();
    initChart();
    initTray();
    initForms();
    initYear();
    window.__dantolaReady = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
