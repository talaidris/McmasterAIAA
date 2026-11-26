/* Projects page: builds one wide card per project from data/projects.json (the admin page edits that file).
   Each card has: title, a photo carousel, the project description, large profiles for the project's
   leaders, a short list of highlights (sub-teams, member count, links) and an optional button.
   The styles live in this file (see STYLES). A missing photo falls back to a placeholder or initials. */

/* ==========================================================================
   STYLES. Every class starts with "pj-", so nothing here can clash with styles.css.
   To change the colours, edit the variables on .pj-list.
   ========================================================================== */
const STYLES = `
.pj-list {
  --pj-ink: var(--navy, #0b2a5b);
  --pj-text: #2b3a55;
  --pj-muted: #54627b;
  --pj-soft: #eaf0f8;
  --pj-line: rgba(11, 42, 91, 0.14);
  --pj-accent: #2f6fa3;

  display: grid;
  gap: clamp(1.4rem, 3vw, 2.4rem);
}

/* ---------- Card ---------- */
.pj-card {
  background: #fff;
  color: var(--pj-ink);
  border: 1px solid var(--pj-line);
  border-radius: 1.1rem;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(11, 42, 91, 0.06), 0 16px 36px -22px rgba(11, 42, 91, 0.35);
  transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.js .pj-card { opacity: 0; transform: translateY(18px); }
.js .pj-card.is-in { opacity: 1; transform: none; }

/* ---------- Title bar ---------- */
.pj-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 1rem;
  padding: clamp(1.1rem, 2.4vw, 1.6rem) clamp(1.1rem, 2.6vw, 1.9rem) 0.9rem;
  border-bottom: 1px solid var(--pj-line);
}
.pj-name {
  margin: 0;
  font-family: var(--display, "Big Shoulders Display", "Arial Narrow", Impact, sans-serif);
  font-weight: 800;
  font-size: clamp(2.1rem, 3.6vw, 2.9rem);
  line-height: 0.95;
  color: var(--pj-ink);
}
.pj-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.6rem; }
.pj-dept { color: var(--pj-muted); font-size: 0.98rem; font-weight: 500; }
.pj-status {
  background: var(--pj-soft);
  color: var(--pj-ink);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
}

/* ---------- Photo box on the left, details on the right ---------- */
.pj-main { display: grid; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 860px) {
  .pj-main { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
}

/* ---------- Photo carousel ---------- */
.pj-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--pj-soft);
}
@media (min-width: 860px) {
  .pj-media { aspect-ratio: auto; min-height: 26rem; }
}
.pj-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--pos, center);
  opacity: 0;
  transition: opacity 0.5s ease;
}
.pj-slide.is-on { opacity: 1; }
.pj-media.is-empty {
  display: grid;
  place-items: center;
  background: linear-gradient(150deg, var(--pj-ink), #1a3d6d 70%, #2f6fa3);
}
.pj-media-placeholder {
  font-family: var(--display, "Big Shoulders Display", "Arial Narrow", Impact, sans-serif);
  font-weight: 900;
  font-size: 4rem;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.92);
}
.pj-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--pj-ink);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(7, 17, 31, 0.28);
  transition: background-color 0.25s, color 0.25s;
}
.pj-arrow:hover { background: var(--pj-ink); color: #fff; }
.pj-arrow svg { width: 1.2rem; height: 1.2rem; }
.pj-prev { left: 0.7rem; }
.pj-next { right: 0.7rem; }
.pj-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.7rem;
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  pointer-events: none;
}
.pj-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(7, 17, 31, 0.25);
}
.pj-dot.is-on { background: #fff; }
.pj-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 1.6rem 1rem 1.9rem;
  background: linear-gradient(transparent, rgba(7, 17, 31, 0.7));
  color: #fff;
  font-size: 0.85rem;
  text-align: center;
  pointer-events: none;
}

/* ---------- Details ---------- */
.pj-body {
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
  min-width: 0;
  padding: clamp(1.1rem, 2.6vw, 1.9rem);
}
.pj-desc { margin: 0; font-size: 1rem; line-height: 1.65; color: var(--pj-text); }

/* Leaders: large profile cards */
.pj-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr));
  gap: 0.9rem;
}
.pj-person {
  display: flex;
  align-items: center;
  gap: 0.95rem;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid var(--pj-line);
  border-radius: 0.9rem;
  background: #f8fafd;
}
.pj-avatar {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 5.2rem;
  height: 5.2rem;
  border-radius: 0.8rem;
  overflow: hidden;
  background: var(--pj-soft);
  border: 1px solid var(--pj-line);
  color: var(--pj-ink);
}
.pj-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pj-initials {
  font-family: var(--display, "Big Shoulders Display", "Arial Narrow", Impact, sans-serif);
  font-weight: 800;
  font-size: 1.7rem;
  line-height: 1;
}
.pj-person-text { min-width: 0; flex: 1; }
.pj-person-name { font-weight: 700; font-size: 1.02rem; line-height: 1.25; overflow-wrap: anywhere; color: var(--pj-ink); }
.pj-person-name a { color: inherit; text-decoration: none; }
.pj-person-name a:hover { text-decoration: underline; text-underline-offset: 3px; }
.pj-person-role { margin-top: 0.15rem; font-size: 0.9rem; font-weight: 600; line-height: 1.3; color: var(--pj-accent); }
.pj-person-year { font-size: 0.85rem; line-height: 1.3; color: var(--pj-muted); }
.pj-social {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  color: var(--pj-ink);
  transition: background-color 0.25s, color 0.25s;
}
.pj-social svg { width: 1.2rem; height: 1.2rem; }
.pj-social:hover { background: var(--pj-ink); color: #fff; }

/* Highlights: a short dash list */
.pj-facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
.pj-facts li {
  position: relative;
  padding-left: 1.3rem;
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--pj-text);
}
.pj-facts li::before { content: "\\2013"; position: absolute; left: 0; color: var(--pj-accent); font-weight: 700; }
.pj-facts a { color: var(--pj-ink); font-weight: 600; text-underline-offset: 3px; }

.pj-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1rem;
  border: 2px solid var(--pj-ink);
  border-radius: 999px;
  color: var(--pj-ink);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.25s, color 0.25s, gap 0.3s;
}
.pj-link:hover { background: var(--pj-ink); color: #fff; gap: 0.75rem; }

.pj-link:focus-visible,
.pj-arrow:focus-visible,
.pj-social:focus-visible,
.pj-person-name a:focus-visible,
.pj-facts a:focus-visible { outline: 3px solid var(--pj-accent); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .js .pj-card { opacity: 1; transform: none; }
  .pj-card, .pj-slide, .pj-link, .pj-social, .pj-arrow { transition: none; }
}
`;

(async () => {
  const host = document.getElementById("project-list");
  if (!host) return;

  if (!document.getElementById("pj-styles")) {
    const style = document.createElement("style");
    style.id = "pj-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const initials = (name) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const safeHref = (u) => (/^(https?:\/\/|mailto:)/i.test(u || "") || /^[\w./-]+\.html?(#.*)?$/.test(u || "") ? u : null);

  const SVG = (d, extra = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ARROW = SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', 'width="16" height="16"');
  const CHEVRON_L = SVG('<path d="M15 5l-7 7 7 7"/>');
  const CHEVRON_R = SVG('<path d="M9 5l7 7-7 7"/>');
  const LINKEDIN =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3V9.75zM9.5 9.75h3.8v1.6h.06c.53-1 1.82-2.05 3.75-2.05 4 0 4.74 2.63 4.74 6.05V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.32-1.96 2.69V21h-4V9.75z"/></svg>';

  /* ---------- Photo carousel ---------- */
  function buildMedia(project) {
    // New format: "images": [{src, alt, caption, position}]. The old single "image" still works.
    let images = Array.isArray(project.images) && project.images.length
      ? project.images
      : project.image ? [{ src: project.image, alt: project.imageAlt, position: project.imagePosition }] : [];
    images = images.filter((i) => i && i.src);

    const media = el("div", "pj-media");
    const showPlaceholder = () => {
      media.textContent = "";
      media.classList.add("is-empty");
      media.appendChild(el("span", "pj-media-placeholder", "AIAA"));
    };
    if (!images.length) { showPlaceholder(); return media; }

    media.setAttribute("role", "group");
    media.setAttribute("aria-roledescription", "carousel");
    media.setAttribute("aria-label", `${project.name} photos`);

    let slides = images.map((info, i) => {
      const img = document.createElement("img");
      img.className = "pj-slide" + (i === 0 ? " is-on" : "");
      img.src = info.src;
      img.alt = info.alt || info.caption || project.name;
      if (i > 0) img.loading = "lazy";
      if (/^[a-z0-9% .-]+$/i.test(info.position || "")) img.style.setProperty("--pos", info.position);
      media.appendChild(img);
      return { img, info };
    });

    let current = 0, dots = [], cap = null;
    const show = (n) => {
      current = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.img.classList.toggle("is-on", i === current));
      dots.forEach((d, i) => d.classList.toggle("is-on", i === current));
      if (cap) cap.textContent = slides[current].info.caption || "";
    };

    if (slides.length > 1) {
      const prev = el("button", "pj-arrow pj-prev"); prev.type = "button"; prev.setAttribute("aria-label", "Previous photo"); prev.innerHTML = CHEVRON_L;
      const next = el("button", "pj-arrow pj-next"); next.type = "button"; next.setAttribute("aria-label", "Next photo"); next.innerHTML = CHEVRON_R;
      prev.addEventListener("click", () => show(current - 1));
      next.addEventListener("click", () => show(current + 1));
      const dotRow = el("div", "pj-dots");
      dots = slides.map((_, i) => { const d = el("span", "pj-dot" + (i === 0 ? " is-on" : "")); dotRow.appendChild(d); return d; });
      media.append(prev, next, dotRow);
      media.tabIndex = 0;
      media.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { show(current - 1); e.preventDefault(); }
        if (e.key === "ArrowRight") { show(current + 1); e.preventDefault(); }
      });
      let x0 = null;   // swipe on touch screens
      media.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      media.addEventListener("touchend", (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      });
    }
    if (images.some((i) => i.caption)) { cap = el("p", "pj-cap", images[0].caption || ""); media.appendChild(cap); }

    // Drop any photo that fails to load; if none are left, show the placeholder.
    slides.forEach((s) => s.img.addEventListener("error", () => {
      s.img.remove(); slides = slides.filter((x) => x !== s);
      if (!slides.length) showPlaceholder(); else show(Math.min(current, slides.length - 1));
    }));
    return media;
  }

  /* ---------- A leader's profile ---------- */
  function buildPerson(person) {
    const li = el("li", "pj-person");

    const avatar = el("div", "pj-avatar");
    const showInitials = () => { avatar.textContent = ""; avatar.appendChild(el("span", "pj-initials", initials(person.name || "?"))); };
    if (person.photo) {
      const img = document.createElement("img");
      img.src = person.photo; img.alt = ""; img.loading = "lazy";
      img.addEventListener("error", showInitials);
      avatar.appendChild(img);
    } else showInitials();

    const text = el("div", "pj-person-text");
    const nameLine = el("div", "pj-person-name");
    const href = safeHref(person.linkedin);
    if (href) {
      const a = el("a", "", person.name);
      a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", `${person.name} on LinkedIn`);
      nameLine.appendChild(a);
    } else nameLine.appendChild(el("span", "", person.name));
    text.appendChild(nameLine);
    if (person.role) text.appendChild(el("div", "pj-person-role", person.role));
    if (person.year) text.appendChild(el("div", "pj-person-year", person.year));

    li.append(avatar, text);
    if (href) {
      const social = el("a", "pj-social");
      social.href = href; social.target = "_blank"; social.rel = "noopener noreferrer";
      social.setAttribute("aria-label", `${person.name} on LinkedIn`);
      social.innerHTML = LINKEDIN;
      li.appendChild(social);
    }
    return li;
  }

  let projects = [];
  try {
    const response = await fetch("data/projects.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status);
    projects = (await response.json()).projects || [];
  } catch (error) {
    host.replaceWith(el("p", "empty", "The projects list could not load. Please try again in a moment."));
    return;
  }
  if (!projects.length) {
    host.appendChild(el("p", "empty", "Our projects will be listed here soon. Check back for updates!"));
    return;
  }

  const list = el("div", "pj-list");

  projects.forEach((project) => {
    if (!project || !project.name) return;
    const card = el("article", "pj-card");

    /* Title bar */
    const head = el("header", "pj-head");
    head.appendChild(el("h3", "pj-name", project.name));
    const meta = el("div", "pj-meta");
    if (project.department) meta.appendChild(el("span", "pj-dept", project.department));
    if (project.status) meta.appendChild(el("span", "pj-status", project.status));
    if (meta.children.length) head.appendChild(meta);

    /* Photo carousel (left) and details (right) */
    const main = el("div", "pj-main");
    const body = el("div", "pj-body");

    if (project.description) body.appendChild(el("p", "pj-desc", project.description));

    // "team" holds the project's leaders; project leads (lead: true) come first.
    const team = (project.team || []).filter((p) => p && p.name)
      .map((p, i) => ({ p, i }))
      .sort((a, b) => (b.p.lead ? 1 : 0) - (a.p.lead ? 1 : 0) || a.i - b.i)
      .map((x) => x.p);
    if (team.length) {
      const people = el("ul", "pj-people");
      people.setAttribute("aria-label", `${project.name} leadership`);
      team.forEach((person) => people.appendChild(buildPerson(person)));
      body.appendChild(people);
    }

    const facts = (project.facts || []).map((f) => String(f).trim()).filter(Boolean);
    if (facts.length) {
      const ul = el("ul", "pj-facts");
      facts.forEach((f) => {
        const li = document.createElement("li");
        if (window.renderInline) window.renderInline(li, f); else li.textContent = f;
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    const learn = safeHref(project.url);
    if (learn) {
      const link = el("a", "pj-link");
      link.href = learn; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Learn more about ${project.name}`);
      link.appendChild(document.createTextNode("Learn More"));
      link.insertAdjacentHTML("beforeend", ARROW);
      body.appendChild(link);
    }

    main.append(buildMedia(project), body);
    card.append(head, main);
    list.appendChild(card);
  });

  host.appendChild(list);

  /* Gentle reveal as each card scrolls into view */
  const cards = list.querySelectorAll(".pj-card");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      }),
      { threshold: 0.08 }
    );
    cards.forEach((c) => io.observe(c));
  } else cards.forEach((c) => c.classList.add("is-in"));

  if (window.ScrollTrigger) ScrollTrigger.refresh();
})();
