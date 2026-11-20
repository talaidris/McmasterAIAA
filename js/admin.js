(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const say = (node, text, kind) => { node.textContent = text; node.className = "ad-msg" + (kind ? " " + kind : ""); };

  let cfg = null, token = null, events = [], doc = null, sha = null, editing = -1, idle = null;

  /* ---------- Unlock ---------- */
  let fails = 0, lockedUntil = 0;
  async function decryptToken(password) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: unb64(cfg.salt), iterations: cfg.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(cfg.iv) }, key, unb64(cfg.ct));
    return new TextDecoder().decode(plain);
  }

  $("ad-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("ad-login-msg"), pw = $("ad-pw");
    const wait = lockedUntil - Date.now();
    if (wait > 0) return say(msg, `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.`, "bad");
    say(msg, "Checking…");
    try {
      if (!cfg) {
        const r = await fetch("data/admin-config.json", { cache: "no-store" });
        if (!r.ok) throw new Error("config");
        cfg = await r.json();
      }
      if (!cfg.ct) throw new Error("config");
    } catch (_) { return say(msg, "Admin is not set up yet (data/admin-config.json is missing).", "bad"); }
    try {
      token = await decryptToken(pw.value);
    } catch (_) {
      fails++;
      lockedUntil = Date.now() + Math.min(60000, 2000 * 2 ** (fails - 1));
      pw.value = "";
      return say(msg, "Incorrect password.", "bad");
    }
    pw.value = ""; fails = 0;
    try { await loadEvents(); } catch (err) { token = null; return say(msg, "Unlocked, but GitHub refused the request: " + err.message, "bad"); }
    say(msg, "");
    $("ad-login").hidden = true; $("ad-app").hidden = false; $("ad-lock").hidden = false;
    renderList(); resetForm(); bumpIdle();
  });

  function lock() {
    token = null; events = []; doc = null; sha = null;
    $("ad-app").hidden = true; $("ad-lock").hidden = true; $("ad-login").hidden = false;
    $("ad-list").textContent = ""; clearTimeout(idle);
  }
  $("ad-lock").addEventListener("click", lock);
  function bumpIdle() { clearTimeout(idle); idle = setTimeout(lock, 15 * 60 * 1000); }
  ["click", "keydown"].forEach((t) => document.addEventListener(t, () => token && bumpIdle()));

  /* ---------- GitHub I/O ---------- */
  const api = () => `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
  const headers = () => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });

  async function loadEvents() {
    const r = await fetch(`${api()}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(), cache: "no-store" });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "the access token is invalid or expired" : "HTTP " + r.status);
    const j = await r.json();
    sha = j.sha;
    doc = JSON.parse(new TextDecoder().decode(unb64(j.content.replace(/\n/g, ""))));
    events = Array.isArray(doc.events) ? doc.events : [];
  }

  const sortKey = (e) => e.date || (e.month ? e.month + "-99" : "9999");
  async function save(message) {
    events.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    doc.events = events;
    const text = JSON.stringify(doc, null, 2) + "\n";
    const bytes = new TextEncoder().encode(text);
    let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const r = await fetch(api(), {
      method: "PUT", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: btoa(bin), sha, branch: cfg.branch }),
    });
    if (r.status === 409 || r.status === 422) throw new Error("someone else changed the events. Lock, unlock again and retry.");
    if (!r.ok) throw new Error("HTTP " + r.status);
    sha = (await r.json()).content.sha;
  }

  /* ---------- Form ---------- */
  const f = { title: $("f-title"), date: $("f-date"), month: $("f-month"), start: $("f-start"), end: $("f-end"), loc: $("f-loc"), desc: $("f-desc"), details: $("f-details"), hide: $("f-hide") };
  const kind = () => document.querySelector('input[name="kind"]:checked').value;
  const syncKind = () => { $("f-date-wrap").hidden = kind() !== "date"; $("f-month-wrap").hidden = kind() !== "month"; };
  document.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", syncKind));

  const to12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const to24 = (s) => { const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(s || ""); if (!m) return ""; let h = Number(m[1]) % 12; if (m[3].toUpperCase() === "PM") h += 12; return String(h).padStart(2, "0") + ":" + m[2]; };


  /* ---------- Photos ---------- */
  let imgs = []; // {src?, file?, url, caption, alt?, focus?}
  const MAX_IMGS = 8, MAX_PX = 1600;
  const slug = (t) => (t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event").slice(0, 40);

  function renderImgs() {
    const ul = $("f-imgs"); ul.textContent = "";
    imgs.forEach((it, i) => {
      const li = document.createElement("li");
      const th = document.createElement("img"); th.src = it.url; th.alt = "";
      const cap = document.createElement("input"); cap.placeholder = "Caption (also used as alt text)"; cap.maxLength = 160; cap.value = it.caption || "";
      cap.addEventListener("input", () => { it.caption = cap.value; });
      const btns = el("div", "ad-img-btns");
      const mk = (label, fn, cls) => { const b = el("button", "ad-ghost" + (cls ? " " + cls : ""), label); b.type = "button"; b.addEventListener("click", fn); return b; };
      if (i > 0) btns.appendChild(mk("Move up", () => { imgs.splice(i - 1, 0, imgs.splice(i, 1)[0]); renderImgs(); }));
      if (i < imgs.length - 1) btns.appendChild(mk("Move down", () => { imgs.splice(i + 1, 0, imgs.splice(i, 1)[0]); renderImgs(); }));
      btns.appendChild(mk("Remove", () => { if (it.file) URL.revokeObjectURL(it.url); imgs.splice(i, 1); renderImgs(); }, "ad-del"));
      li.append(th, cap, btns); ul.appendChild(li);
    });
  }
  $("f-files").addEventListener("change", (e) => {
    const room = MAX_IMGS - imgs.length;
    [...e.target.files].slice(0, Math.max(0, room)).forEach((file) => {
      if (!/^image\//.test(file.type)) return;
      imgs.push({ file, url: URL.createObjectURL(file), caption: "" });
    });
    if (e.target.files.length > room) say($("ad-msg"), `Up to ${MAX_IMGS} photos per event. Extra files were skipped.`, "bad");
    e.target.value = ""; renderImgs();
  });

  /* Shrink to max 1600px JPEG so the site stays fast and the repo small. */
  async function prepare(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (_) { throw new Error(`“${file.name}” could not be read. Use a JPG or PNG.`); }
    const k = Math.min(1, MAX_PX / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error(`“${file.name}” could not be converted.`);
    return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(",")[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  }

  async function uploadImages(title, onProgress) {
    const pending = imgs.filter((it) => it.file);
    let n = 0;
    for (const it of pending) {
      onProgress(`Uploading photo ${++n} of ${pending.length}…`);
      const b64 = await prepare(it.file);
      const path = `images/events/${slug(title)}-${Date.now().toString(36)}${n}.jpg`;
      const r = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${path}`, {
        method: "PUT", headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Add event photo: " + title, content: b64, branch: cfg.branch }),
      });
      if (!r.ok) throw new Error(`photo upload failed (HTTP ${r.status})`);
      URL.revokeObjectURL(it.url); it.src = path; it.url = path; delete it.file; // stays uploaded if a later step fails
    }
  }

  function resetForm() {
    editing = -1; $("ad-form").reset(); syncKind(); imgs.forEach((i) => i.file && URL.revokeObjectURL(i.url)); imgs = []; renderImgs();
    $("ad-form-title").textContent = "Add an event"; $("f-save").textContent = "Publish event"; $("f-cancel").hidden = true;
  }
  $("f-cancel").addEventListener("click", () => { resetForm(); say($("ad-msg"), ""); });

  function startEdit(i) {
    const ev = events[i]; editing = i;
    f.title.value = ev.title || ""; f.loc.value = ev.location || ""; f.desc.value = ev.description || ""; f.details.value = ev.details || "";
    imgs = (ev.images || []).map((i) => ({ ...i, url: i.src }));  renderImgs(); f.hide.checked = !!ev.hideOnEventsPage;
    document.querySelector(`input[name="kind"][value="${ev.date ? "date" : "month"}"]`).checked = true; syncKind();
    f.date.value = ev.date || ""; f.month.value = ev.month || "";
    const [a, b] = (ev.time || "").split(/\s*-\s*/); f.start.value = to24(a); f.end.value = to24(b);
    $("ad-form-title").textContent = "Edit event"; $("f-save").textContent = "Save changes"; $("f-cancel").hidden = false;
    $("ad-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("ad-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("ad-msg"), btn = $("f-save");
    const title = f.title.value.trim();
    if (!title) return say(msg, "Please enter a title.", "bad");
    const ev = { title };
    if (kind() === "date") { if (!f.date.value) return say(msg, "Please choose a date.", "bad"); ev.date = f.date.value; }
    else { if (!f.month.value) return say(msg, "Please choose a month.", "bad"); ev.month = f.month.value; }
    if (f.start.value) ev.time = to12(f.start.value) + (f.end.value ? " - " + to12(f.end.value) : "");
    if (f.loc.value.trim()) ev.location = f.loc.value.trim();
    if (f.desc.value.trim()) ev.description = f.desc.value.trim();
    if (f.details.value.trim()) ev.details = f.details.value.trim();
    if (f.hide.checked) ev.hideOnEventsPage = true;

    btn.disabled = true; say(msg, "Publishing…");
    const before = events.slice();
    try {
      await uploadImages(title, (t) => say(msg, t));
      if (imgs.length) ev.images = imgs.map((i) => { const o = { src: i.src }; if (i.caption && i.caption.trim()) o.caption = i.caption.trim(); if (i.alt) o.alt = i.alt; if (i.focus) o.focus = i.focus; return o; });
      say(msg, "Publishing…");
      // keep any fields this form doesn't manage when editing
      const merged = editing >= 0 ? { ...events[editing] } : {};
      ["title", "date", "month", "time", "location", "description", "details", "images", "hideOnEventsPage"].forEach((k) => delete merged[k]);
      const out = { ...ev, ...merged };
      if (editing >= 0) events[editing] = out; else events.push(out);
      await save((editing >= 0 ? "Update event: " : "Add event: ") + title);
      say(msg, "Published. The site updates in about a minute.", "ok");
      resetForm(); renderList();
    } catch (err) { events = before; say(msg, "Could not publish: " + err.message, "bad"); }
    finally { btn.disabled = false; }
  });

  /* ---------- List ---------- */
  function when(ev) {
    if (ev.date) { const [y, m, d] = ev.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }); }
    const [y, m] = ev.month.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-CA", { year: "numeric", month: "long" }) + " (TBA)";
  }
  function renderList() {
    const ul = $("ad-list"); ul.textContent = "";
    if (!events.length) ul.appendChild(el("li", "", "No events yet."));
    events.forEach((ev, i) => {
      const li = el("li"), left = el("div");
      left.append(el("b", "", ev.title), el("small", "", [when(ev), ev.time, ev.location].filter(Boolean).join(" · ")));
      const right = el("div"), ed = el("button", "ad-ghost", "Edit"), del = el("button", "ad-ghost ad-del", "Delete");
      ed.type = del.type = "button";
      ed.addEventListener("click", () => startEdit(i));
      del.addEventListener("click", async () => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        const before = events.slice(); events.splice(i, 1);
        try { await save("Delete event: " + ev.title); say($("ad-msg"), "Deleted. The site updates in about a minute.", "ok"); resetForm(); renderList(); }
        catch (err) { events = before; say($("ad-msg"), "Could not delete: " + err.message, "bad"); }
      });
      right.append(ed, " ", del); li.append(left, right); ul.appendChild(li);
    });
  }
})();
