/* Admin: unlock with the password, then edit the Events (data/events.json) and Projects (data/projects.json).
   HOW IT WORKS (no server needed):
   - data/admin-config.json holds a GitHub access token ENCRYPTED with the admin password
     (AES-256-GCM, PBKDF2 600k rounds). The password itself is never stored anywhere.
   - A correct password decrypts the token in memory only. A wrong one simply fails to decrypt.
   - Publishing commits the JSON file (and any uploaded photos) to the repo through the GitHub API;
     GitHub Pages then redeploys the site.
   Everything the page shows is inserted with textContent, never innerHTML. */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const say = (node, text, kind) => { node.textContent = text; node.className = "ad-msg" + (kind ? " " + kind : ""); };
  const slug = (t) => (String(t).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item").slice(0, 40);
  const button = (label, fn, cls) => { const b = el("button", "ad-ghost" + (cls ? " " + cls : ""), label); b.type = "button"; b.addEventListener("click", fn); return b; };
  const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);

  let cfg = null, token = null, idle = null;
  const files = { events: null, projects: null };           // { path, sha, doc } once loaded
  const evList = () => files.events.doc.events || (files.events.doc.events = []);
  const pjList = () => files.projects.doc.projects || (files.projects.doc.projects = []);

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
    try {
      const dir = cfg.path.replace(/[^/]*$/, "");
      await load("events", cfg.path);
      await load("projects", dir + "projects.json");
    } catch (err) { token = null; return say(msg, "Unlocked, but GitHub refused the request: " + err.message, "bad"); }
    say(msg, "");
    $("ad-login").hidden = true; $("ad-app").hidden = false; $("ad-lock").hidden = false;
    renderEvents(); resetEventForm(); renderProjects(); resetProjectForm(); showTab("events"); bumpIdle();
  });

  function lock() {
    token = null; files.events = files.projects = null;
    $("ad-app").hidden = true; $("ad-lock").hidden = true; $("ad-login").hidden = false;
    $("ad-list").textContent = ""; $("p-list").textContent = ""; clearTimeout(idle);
  }
  $("ad-lock").addEventListener("click", lock);
  function bumpIdle() { clearTimeout(idle); idle = setTimeout(lock, 15 * 60 * 1000); }
  ["click", "keydown"].forEach((t) => document.addEventListener(t, () => token && bumpIdle()));

  /* ---------- Tabs ---------- */
  function showTab(name) {
    ["events", "projects"].forEach((n) => {
      $("panel-" + n).hidden = n !== name;
      $("tab-" + n).setAttribute("aria-selected", String(n === name));
    });
  }
  $("tab-events").addEventListener("click", () => showTab("events"));
  $("tab-projects").addEventListener("click", () => showTab("projects"));

  /* ---------- GitHub ---------- */
  const api = (path) => `https://api.github.com/repos/${cfg.repo}/contents/${path}`;
  const headers = () => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });

  async function load(key, path) {
    const r = await fetch(`${api(path)}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(), cache: "no-store" });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "the access token is invalid or expired" : `${path}: HTTP ${r.status}`);
    const j = await r.json();
    files[key] = { path, sha: j.sha, doc: JSON.parse(new TextDecoder().decode(unb64(j.content.replace(/\n/g, "")))) };
  }

  const toB64 = (text) => { const bytes = new TextEncoder().encode(text); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
  async function save(key, message) {
    const f = files[key];
    const r = await fetch(api(f.path), {
      method: "PUT", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: toB64(JSON.stringify(f.doc, null, 2) + "\n"), sha: f.sha, branch: cfg.branch }),
    });
    if (r.status === 409 || r.status === 422) throw new Error("someone else changed this. Lock, unlock again and retry.");
    if (!r.ok) throw new Error("HTTP " + r.status);
    f.sha = (await r.json()).content.sha;
  }

  /* ---------- Photos: shrink, upload, and the editable photo list ---------- */
  async function prepare(file, maxPx) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (_) { throw new Error(`“${file.name}” could not be read. Use a JPG or PNG.`); }
    const k = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error(`“${file.name}” could not be converted.`);
    return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(",")[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  }
  let uploadCount = 0;
  async function uploadPhoto(file, folder, base, maxPx, message) {
    const b64 = await prepare(file, maxPx);
    const path = `${folder}/${slug(base)}-${Date.now().toString(36)}${++uploadCount}.jpg`;
    const r = await fetch(api(path), {
      method: "PUT", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: b64, branch: cfg.branch }),
    });
    if (!r.ok) throw new Error(`photo upload failed (HTTP ${r.status})`);
    return path;
  }

  /* A list of photos with captions, reordering and removal. `input` is the file picker. */
  function makeImageList(ul, input, msgNode, max) {
    let items = [];
    const release = () => items.forEach((i) => i.file && URL.revokeObjectURL(i.url));
    function render() {
      ul.textContent = "";
      items.forEach((it, i) => {
        const li = document.createElement("li");
        const th = document.createElement("img"); th.src = it.url; th.alt = "";
        const cap = document.createElement("input"); cap.placeholder = "Caption (also used as alt text)"; cap.maxLength = 160; cap.value = it.caption || "";
        cap.addEventListener("input", () => { it.caption = cap.value; });
        const btns = el("div", "ad-img-btns");
        if (i > 0) btns.appendChild(button("Move up", () => { items.splice(i - 1, 0, items.splice(i, 1)[0]); render(); }));
        if (i < items.length - 1) btns.appendChild(button("Move down", () => { items.splice(i + 1, 0, items.splice(i, 1)[0]); render(); }));
        btns.appendChild(button("Remove", () => { if (it.file) URL.revokeObjectURL(it.url); items.splice(i, 1); render(); }, "ad-del"));
        li.append(th, cap, btns); ul.appendChild(li);
      });
    }
    input.addEventListener("change", () => {
      const room = Math.max(0, max - items.length);
      [...input.files].slice(0, room).forEach((file) => { if (/^image\//.test(file.type)) items.push({ file, url: URL.createObjectURL(file), caption: "" }); });
      if (input.files.length > room) say(msgNode, `Up to ${max} photos. Extra files were skipped.`, "bad");
      input.value = ""; render();
    });
    return {
      set(arr) { release(); items = (arr || []).map((i) => ({ ...i, url: i.src })); render(); },
      clear() { release(); items = []; render(); },
      count: () => items.length,
      async upload(folder, base, maxPx, progress) {
        const pending = items.filter((i) => i.file); let n = 0;
        for (const it of pending) {
          progress(`Uploading photo ${++n} of ${pending.length}…`);
          const path = await uploadPhoto(it.file, folder, base, maxPx, "Add photo: " + base);
          URL.revokeObjectURL(it.url); it.src = path; it.url = path; delete it.file;   // stays uploaded if a later step fails
        }
      },
      out() {
        return items.map((i) => { const o = { ...i }; delete o.file; delete o.url; if (o.caption != null) { o.caption = String(o.caption).trim(); if (!o.caption) delete o.caption; } return o; });
      },
    };
  }

  /* =====================================================================
     EVENTS
     ===================================================================== */
  const f = { title: $("f-title"), date: $("f-date"), month: $("f-month"), start: $("f-start"), end: $("f-end"), loc: $("f-loc"), desc: $("f-desc"), details: $("f-details"), hide: $("f-hide") };
  const evImgs = makeImageList($("f-imgs"), $("f-files"), $("ad-msg"), 8);
  let editingEvent = -1;
  const kind = () => document.querySelector('input[name="kind"]:checked').value;
  const syncKind = () => { $("f-date-wrap").hidden = kind() !== "date"; $("f-month-wrap").hidden = kind() !== "month"; };
  document.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", syncKind));

  const to12 = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const to24 = (s) => { const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(s || ""); if (!m) return ""; let h = Number(m[1]) % 12; if (m[3].toUpperCase() === "PM") h += 12; return String(h).padStart(2, "0") + ":" + m[2]; };

  function renderPreview() {
    const box = $("f-preview"); box.textContent = "";
    if (f.details.value.trim()) window.renderWriteUp(box, f.details.value);
    else box.appendChild(el("p", "ad-empty", "Nothing to preview yet."));
  }
  f.details.addEventListener("input", renderPreview);

  function resetEventForm() {
    editingEvent = -1; $("ad-form").reset(); syncKind(); renderPreview(); evImgs.clear();
    $("ad-form-title").textContent = "Add an event"; $("f-save").textContent = "Publish event"; $("f-cancel").hidden = true;
  }
  $("f-cancel").addEventListener("click", () => { resetEventForm(); say($("ad-msg"), ""); });

  function startEditEvent(i) {
    const ev = evList()[i]; editingEvent = i;
    f.title.value = ev.title || ""; f.loc.value = ev.location || ""; f.desc.value = ev.description || ""; f.details.value = ev.details || ""; renderPreview();
    evImgs.set(ev.images); f.hide.checked = !!ev.hideOnEventsPage;
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
    const events = evList(), before = events.slice();
    try {
      await evImgs.upload("images/events", title, 1600, (t) => say(msg, t));
      if (evImgs.count()) ev.images = evImgs.out();
      say(msg, "Publishing…");
      // keep any fields this form doesn't manage when editing
      const kept = editingEvent >= 0 ? { ...events[editingEvent] } : {};
      ["title", "date", "month", "time", "location", "description", "details", "images", "hideOnEventsPage"].forEach((k) => delete kept[k]);
      const out = { ...ev, ...kept };
      if (editingEvent >= 0) events[editingEvent] = out; else events.push(out);
      const key = (x) => x.date || (x.month ? x.month + "-99" : "9999");
      events.sort((a, b) => key(a).localeCompare(key(b)));
      await save("events", (editingEvent >= 0 ? "Update event: " : "Add event: ") + title);
      say(msg, "Published. The site updates in about a minute.", "ok");
      resetEventForm(); renderEvents();
    } catch (err) { files.events.doc.events = before; renderEvents(); say(msg, "Could not publish: " + err.message, "bad"); }
    finally { btn.disabled = false; }
  });

  function when(ev) {
    if (ev.date) { const [y, m, d] = ev.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }); }
    const [y, m] = ev.month.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-CA", { year: "numeric", month: "long" }) + " (TBA)";
  }
  function renderEvents() {
    const ul = $("ad-list"); ul.textContent = "";
    const events = evList();
    if (!events.length) ul.appendChild(el("li", "", "No events yet."));
    events.forEach((ev, i) => {
      const li = el("li"), left = el("div");
      left.append(el("b", "", ev.title), el("small", "", [when(ev), ev.time, ev.location].filter(Boolean).join(" · ")));
      const right = el("div");
      right.append(button("Edit", () => startEditEvent(i)), " ", button("Delete", async () => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        const before = events.slice(); events.splice(i, 1);
        try { await save("events", "Delete event: " + ev.title); say($("ad-msg"), "Deleted. The site updates in about a minute.", "ok"); resetEventForm(); renderEvents(); }
        catch (err) { files.events.doc.events = before; renderEvents(); say($("ad-msg"), "Could not delete: " + err.message, "bad"); }
      }, "ad-del"));
      li.append(left, right); ul.appendChild(li);
    });
  }

  /* =====================================================================
     PROJECTS
     ===================================================================== */
  const p = { name: $("p-name"), dept: $("p-dept"), status: $("p-status"), desc: $("p-desc"), facts: $("p-facts"), url: $("p-url") };
  const pjImgs = makeImageList($("p-imgs"), $("p-photos"), $("p-msg"), 10);
  let editingProject = -1;
  let members = [];   // { orig, name, role, year, linkedin, lead, photo, file, url }

  const MEMBER_KEYS = ["name", "role", "year", "program", "lead", "photo", "linkedin"];
  const PROJECT_KEYS = ["name", "department", "status", "description", "facts", "url", "images", "image", "imageAlt", "imagePosition", "team"];

  function renderMembers() {
    const box = $("p-team"); box.textContent = "";
    members.forEach((m, i) => {
      const card = el("div", "ad-member");
      const top = el("div", "ad-member-top");
      const thumb = m.url ? Object.assign(document.createElement("img"), { src: m.url, alt: "" }) : el("div", "ad-noimg", "No photo");
      const pick = document.createElement("input"); pick.type = "file"; pick.accept = "image/*";
      pick.addEventListener("change", () => {
        const file = pick.files[0]; if (!file || !/^image\//.test(file.type)) return;
        if (m.file) URL.revokeObjectURL(m.url);
        m.file = file; m.url = URL.createObjectURL(file); renderMembers();
      });
      const pickWrap = el("div"); pickWrap.append(pick);
      top.append(thumb, pickWrap);
      card.appendChild(top);

      const field = (label, key, ph, max) => {
        const id = `m${i}-${key}`;
        const lab = el("label", "", label); lab.htmlFor = id;
        const inp = document.createElement("input"); inp.id = id; inp.value = m[key] || ""; inp.maxLength = max || 120; if (ph) inp.placeholder = ph;
        inp.addEventListener("input", () => { m[key] = inp.value; });
        card.append(lab, inp);
      };
      field("Name *", "name", "", 80);
      field("Role", "role", "e.g. Project Lead or Technical Project Manager", 80);
      field("Year / program", "year", "e.g. Mech Eng, Year 3", 80);
      field("LinkedIn link (optional)", "linkedin", "https://www.linkedin.com/in/…", 300);

      const chk = el("label", "ad-check"); const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!m.lead;
      cb.addEventListener("change", () => { m.lead = cb.checked; });
      chk.append(cb, "Project lead (listed first)");
      card.appendChild(chk);

      const btns = el("div", "ad-member-btns");
      if (i > 0) btns.appendChild(button("Move up", () => { members.splice(i - 1, 0, members.splice(i, 1)[0]); renderMembers(); }));
      if (i < members.length - 1) btns.appendChild(button("Move down", () => { members.splice(i + 1, 0, members.splice(i, 1)[0]); renderMembers(); }));
      if (m.photo || m.file) btns.appendChild(button("Remove photo", () => { if (m.file) URL.revokeObjectURL(m.url); m.file = null; m.photo = ""; m.url = ""; renderMembers(); }));
      btns.appendChild(button("Remove person", () => { if (m.file) URL.revokeObjectURL(m.url); members.splice(i, 1); renderMembers(); }, "ad-del"));
      card.appendChild(btns);
      box.appendChild(card);
    });
  }
  $("p-add-member").addEventListener("click", () => { members.push({ orig: {}, name: "", role: "", year: "", linkedin: "", lead: false, photo: "", url: "" }); renderMembers(); });

  function resetProjectForm() {
    editingProject = -1; $("p-form").reset(); pjImgs.clear();
    members.forEach((m) => m.file && URL.revokeObjectURL(m.url)); members = []; renderMembers();
    $("p-form-title").textContent = "Add a project"; $("p-save").textContent = "Publish project"; $("p-cancel").hidden = true;
  }
  $("p-cancel").addEventListener("click", () => { resetProjectForm(); say($("p-msg"), ""); });

  function startEditProject(i) {
    const pr = pjList()[i]; editingProject = i;
    p.name.value = pr.name || ""; p.dept.value = pr.department || ""; p.status.value = pr.status || "";
    p.desc.value = pr.description || ""; p.facts.value = (pr.facts || []).join("\n"); p.url.value = pr.url || "";
    // older projects have a single "image"; show it as the first photo
    pjImgs.set(Array.isArray(pr.images) && pr.images.length ? pr.images
      : pr.image ? [{ src: pr.image, alt: pr.imageAlt, position: pr.imagePosition }] : []);
    members.forEach((m) => m.file && URL.revokeObjectURL(m.url));
    members = (pr.team || []).map((t) => ({ orig: t, name: t.name || "", role: t.role || "", year: t.year || t.program || "", linkedin: t.linkedin || "", lead: !!t.lead, photo: t.photo || "", url: t.photo || "" }));
    renderMembers();
    $("p-form-title").textContent = "Edit project"; $("p-save").textContent = "Save changes"; $("p-cancel").hidden = false;
    $("p-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("p-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("p-msg"), btn = $("p-save");
    const name = p.name.value.trim();
    if (!name) return say(msg, "Please enter a project name.", "bad");
    if (p.url.value.trim() && !isUrl(p.url.value.trim())) return say(msg, "The Learn More link must start with https://", "bad");
    for (const [i, m] of members.entries()) {
      if (!m.name.trim()) return say(msg, `Person ${i + 1} needs a name (or remove them).`, "bad");
      if (m.linkedin.trim() && !isUrl(m.linkedin.trim())) return say(msg, `${m.name}: the LinkedIn link must start with https://`, "bad");
    }

    btn.disabled = true; say(msg, "Publishing…");
    const projects = pjList(), before = projects.slice();
    try {
      await pjImgs.upload("images/projects", name, 1600, (t) => say(msg, t));
      let n = 0; const pending = members.filter((m) => m.file);
      for (const m of pending) {
        say(msg, `Uploading profile photo ${++n} of ${pending.length}…`);
        m.photo = await uploadPhoto(m.file, "images/members", m.name, 900, "Add profile photo: " + m.name);
        URL.revokeObjectURL(m.url); m.url = m.photo; m.file = null;
      }
      say(msg, "Publishing…");

      const kept = editingProject >= 0 ? { ...projects[editingProject] } : {};
      PROJECT_KEYS.forEach((k) => delete kept[k]);
      const out = { name };
      if (p.dept.value.trim()) out.department = p.dept.value.trim();
      if (p.status.value.trim()) out.status = p.status.value.trim();
      if (p.desc.value.trim()) out.description = p.desc.value.trim();
      if (pjImgs.count()) out.images = pjImgs.out();
      const facts = p.facts.value.split("\n").map((l) => l.trim()).filter(Boolean);
      if (facts.length) out.facts = facts;
      if (p.url.value.trim()) out.url = p.url.value.trim();
      if (members.length) {
        out.team = members.map((m) => {
          const t = { ...m.orig }; MEMBER_KEYS.forEach((k) => delete t[k]);
          const o = { name: m.name.trim() };
          if (m.role.trim()) o.role = m.role.trim();
          if (m.year.trim()) o.year = m.year.trim();
          if (m.lead) o.lead = true;
          if (m.photo) o.photo = m.photo;
          if (m.linkedin.trim()) o.linkedin = m.linkedin.trim();
          return { ...o, ...t };
        });
      }
      const merged = { ...out, ...kept };
      if (editingProject >= 0) projects[editingProject] = merged; else projects.push(merged);
      await save("projects", (editingProject >= 0 ? "Update project: " : "Add project: ") + name);
      say(msg, "Published. The site updates in about a minute.", "ok");
      resetProjectForm(); renderProjects();
    } catch (err) { files.projects.doc.projects = before; renderProjects(); say(msg, "Could not publish: " + err.message, "bad"); }
    finally { btn.disabled = false; }
  });

  function renderProjects() {
    const ul = $("p-list"); ul.textContent = "";
    const projects = pjList();
    if (!projects.length) ul.appendChild(el("li", "", "No projects yet."));
    projects.forEach((pr, i) => {
      const li = el("li"), left = el("div");
      const people = (pr.team || []).length;
      left.append(el("b", "", pr.name), el("small", "", [pr.department, pr.status, people ? `${people} ${people === 1 ? "leader" : "leaders"}` : ""].filter(Boolean).join(" · ")));
      const right = el("div");
      const move = (d) => async () => {
        const before = projects.slice(); projects.splice(i + d, 0, projects.splice(i, 1)[0]);
        try { await save("projects", "Reorder projects"); say($("p-msg"), "Order saved. The site updates in about a minute.", "ok"); renderProjects(); }
        catch (err) { files.projects.doc.projects = before; renderProjects(); say($("p-msg"), "Could not reorder: " + err.message, "bad"); }
      };
      if (i > 0) right.append(button("↑", move(-1)), " ");
      if (i < projects.length - 1) right.append(button("↓", move(1)), " ");
      right.append(button("Edit", () => startEditProject(i)), " ", button("Delete", async () => {
        if (!confirm(`Delete the project "${pr.name}"?`)) return;
        const before = projects.slice(); projects.splice(i, 1);
        try { await save("projects", "Delete project: " + pr.name); say($("p-msg"), "Deleted. The site updates in about a minute.", "ok"); resetProjectForm(); renderProjects(); }
        catch (err) { files.projects.doc.projects = before; renderProjects(); say($("p-msg"), "Could not delete: " + err.message, "bad"); }
      }, "ad-del"));
      li.append(left, right); ul.appendChild(li);
    });
  }
})();
