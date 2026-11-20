/* Events page: builds the event list from data/events.json (the same file the calendar uses and the
   admin page edits). Upcoming events come first (soonest first), then past events (newest first),
   then the permanent items already written in events.html. Everything is inserted as text, never HTML. */
(async () => {
  const list = document.getElementById("events-list");
  if (!list) return;

  let events = [];
  try {
    const r = await fetch("data/events.json", { cache: "no-cache" });
    if (r.ok) events = (await r.json()).events || [];
  } catch (_) { /* leave the permanent items in place */ }

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  function gallery(parent, ev) {
    const imgs = (ev.images || []).filter((i) => i && /^(images\/|https?:\/\/)/.test(i.src || ""));
    if (!imgs.length) return;
    const g = el("div", "ko-gallery");
    imgs.forEach((i) => {
      const b = el("button"); b.type = "button"; b.dataset.full = i.src; b.dataset.cap = i.caption || "";
      const img = document.createElement("img");
      img.src = i.src; img.alt = i.alt || i.caption || ev.title; img.loading = "lazy";
      if (/^[a-z0-9% .-]+$/i.test(i.focus || "")) img.style.objectPosition = i.focus;
      b.appendChild(img); g.appendChild(b);
    });
    parent.appendChild(g);
  }

  function whenText(ev) {
    if (ev.date) { const [y, m, d] = ev.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }); }
    const [y, m] = ev.month.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-CA", { year: "numeric", month: "long" });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const key = (e) => e.date || e.month + "-99";
  const shown = events.filter((e) => e && e.title && (e.date || e.month) && !e.hideOnEventsPage);
  const isUpcoming = (e) => key(e) >= today || (!e.date && e.month >= today.slice(0, 7));
  const upcoming = shown.filter(isUpcoming).sort((a, b) => key(a).localeCompare(key(b)));
  const past = shown.filter((e) => !isUpcoming(e)).sort((a, b) => key(b).localeCompare(key(a)));

  const frag = document.createDocumentFragment();
  [...upcoming, ...past].forEach((ev) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.append(el("p", "when", whenText(ev)), el("h3", "", ev.title));
    const right = document.createElement("div");
    if (ev.details) {
      right.className = "ev-details"; window.renderWriteUp(right, ev.details, { plainList: ev.listStyle === "plain" });
    } else {
      if (ev.description) right.appendChild(el("p", "", ev.description));
      const meta = [ev.time, ev.location].filter(Boolean).join(" · ");
      if (meta) right.appendChild(el("p", "", meta));
    }
    gallery(right, ev);
    li.append(left, right); frag.appendChild(li);
  });
  list.prepend(frag);
  if (window.ScrollTrigger) ScrollTrigger.refresh();

  /* Photo viewer (one dialog shared by every gallery on the page) */
  const box = document.getElementById("ko-box");
  if (box && box.showModal) {
    const img = document.getElementById("ko-img"), cap = document.getElementById("ko-cap");
    list.addEventListener("click", (e) => {
      const t = e.target.closest(".ko-gallery button"); if (!t) return;
      img.src = t.dataset.full; img.alt = t.querySelector("img").alt; cap.textContent = t.dataset.cap;
      box.showModal();
    });
    box.addEventListener("click", (e) => { if (e.target === box || e.target.tagName === "DIV") box.close(); });
  }
})();
