/* Calendar page: month grid built from data/events.json */
(async () => {
  const grid = document.getElementById("cal-grid");
  const titleEl = document.getElementById("cal-title");
  const undated = document.getElementById("cal-undated");
  const undatedList = document.getElementById("cal-undated-list");
  const dialog = document.getElementById("event-dialog");
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const pad = (n) => String(n).padStart(2, "0");
  const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  let events = [];
  try {
    const res = await fetch("data/events.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    events = (await res.json()).events || [];
  } catch (err) {
    grid.replaceWith(el("p", "empty", "The calendar could not load. Open the site through the local server (npm start) rather than double-clicking the file."));
    return;
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  function openEvent(ev) {
    document.getElementById("ev-title").textContent = ev.title;
    const meta = document.getElementById("ev-meta");
    meta.textContent = "";
    const row = (k, v) => { if (!v) return; meta.appendChild(el("dt", "", k)); meta.appendChild(el("dd", "", v)); };
    if (ev.date) {
      const [y, m, d] = ev.date.split("-").map(Number);
      row("Date", new Date(y, m - 1, d).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    } else if (ev.month) {
      const [y, m] = ev.month.split("-").map(Number);
      row("Date", `${new Date(y, m - 1, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" })} (to be announced)`);
    }
    row("Time", ev.time);
    row("Location", ev.location);
    document.getElementById("ev-desc").textContent = ev.description || "";
    if (window.aiaaLenis) window.aiaaLenis.stop();
    dialog.showModal();
  }
  const closeDialog = () => dialog.close();
  dialog.addEventListener("close", () => { if (window.aiaaLenis) window.aiaaLenis.start(); });
  document.getElementById("ev-close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) closeDialog(); });

  function render() {
    const first = new Date(year, month, 1);
    titleEl.textContent = first.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    grid.textContent = "";
    DOW.forEach((d) => { const c = el("div", "cal-dow", d); c.setAttribute("role", "columnheader"); grid.appendChild(c); });

    const start = new Date(year, month, 1 - first.getDay());
    const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());
    const byDate = {};
    events.filter((e) => e.date).forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });

    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = key(d.getFullYear(), d.getMonth(), d.getDate());
      const cell = el("div", "cal-day");
      cell.setAttribute("role", "gridcell");
      if (d.getMonth() !== month) cell.classList.add("out");
      if (k === todayKey) cell.classList.add("today");
      cell.appendChild(el("span", "num", String(d.getDate())));
      (byDate[k] || []).forEach((ev) => {
        const b = el("button", "cal-ev", ev.title);
        b.type = "button";
        b.setAttribute("aria-label", `${ev.title}, ${k}`);
        b.addEventListener("click", () => openEvent(ev));
        cell.appendChild(b);
      });
      grid.appendChild(cell);
      // Skip a fully empty trailing row.
      if (i === 34 && new Date(start.getFullYear(), start.getMonth(), start.getDate() + 35).getMonth() !== month) break;
    }

    // Events that only have a month (no fixed day yet)
    const mk = `${year}-${pad(month + 1)}`;
    const loose = events.filter((e) => !e.date && e.month === mk);
    undatedList.textContent = "";
    undated.hidden = loose.length === 0;
    loose.forEach((ev) => {
      const li = document.createElement("li");
      const left = el("div");
      const btn = el("button", "", ev.title);
      btn.type = "button";
      btn.className = "title-btn";
      const h3 = document.createElement("h3");
      h3.appendChild(btn);
      left.appendChild(h3);
      const right = el("p", "", ev.description || "");
      li.append(left, right);
      btn.addEventListener("click", () => openEvent(ev));
      undatedList.appendChild(li);
    });

    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  const shift = (n) => { month += n; if (month < 0) { month = 11; year--; } if (month > 11) { month = 0; year++; } render(); };
  document.getElementById("cal-prev").addEventListener("click", () => shift(-1));
  document.getElementById("cal-next").addEventListener("click", () => shift(1));
  document.getElementById("cal-today").addEventListener("click", () => { year = now.getFullYear(); month = now.getMonth(); render(); });

  render();
})();
