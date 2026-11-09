/* Projects page: builds a card for each project, with its team at the bottom, from data/projects.json.
   The card styling lives in this file (see STYLES below), so no separate stylesheet is needed.
   A missing image or photo falls back to a placeholder or the person's initials.
   A team member with a "linkedin" link gets a LinkedIn icon on the right side of their row. */

/* ==========================================================================
   STYLES. Every class starts with "pj-", so nothing here can clash with styles.css.
   To change the colours, edit the variables on .pj-list.
   To change the picture's shape, edit aspect-ratio on .pj-media (5 / 3 is wide and short; 1 / 1 is square).
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
  /* Each card is 22rem wide (about 350px), as before; extra projects sit beside it, then wrap. */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 22rem));
  justify-content: start;
  gap: clamp(1.2rem, 2.5vw, 2rem);
}

/* ---------- Card ---------- */
.pj-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  color: var(--pj-ink);
  border: 1px solid var(--pj-line);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(11, 42, 91, 0.06), 0 16px 36px -22px rgba(11, 42, 91, 0.35);
  transition: box-shadow 0.45s ease, opacity 0.8s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.pj-card:hover {
  box-shadow: 0 1px 2px rgba(11, 42, 91, 0.06), 0 26px 50px -24px rgba(11, 42, 91, 0.45);
}
/* Cards fade up once as they scroll into view (only when JavaScript is running). */
.js .pj-card { opacity: 0; transform: translateY(18px); }
.js .pj-card.is-in { opacity: 1; transform: none; }

/* ---------- Picture: a wide, short crop of the image ---------- */
.pj-media {
  position: relative;
  aspect-ratio: 5 / 3;
  overflow: hidden;
  background: var(--pj-soft);
}
.pj-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--pj-pos, center);
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
}
.pj-card:hover .pj-media img { transform: scale(1.04); }
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

/* ---------- Text ---------- */
.pj-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.9rem;
  min-width: 0;
  padding: clamp(1.1rem, 2.2vw, 1.5rem);
}
.pj-head { display: grid; gap: 0.4rem; }
.pj-name {
  margin: 0;
  font-family: var(--display, "Big Shoulders Display", "Arial Narrow", Impact, sans-serif);
  font-weight: 800;
  font-size: clamp(1.9rem, 3vw, 2.3rem);
  line-height: 0.95;
  color: var(--pj-ink);
}
.pj-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.6rem; }
.pj-dept { color: var(--pj-muted); font-size: 0.95rem; font-weight: 500; }
.pj-status {
  background: var(--pj-soft);
  color: var(--pj-ink);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
}
.pj-desc { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--pj-text); }

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
.pj-person-name a:focus-visible { outline: 3px solid var(--pj-accent); outline-offset: 3px; }

/* ---------- Team, at the bottom of the card ---------- */
.pj-team {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--pj-line);
}
.pj-team-title {
  margin: 0 0 0.75rem;
  font-family: var(--body, system-ui, sans-serif);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--pj-muted);
}
.pj-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: 0.85rem 1rem;
}
.pj-person { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
.pj-avatar {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  overflow: hidden;
  background: var(--pj-soft);
  border: 1px solid var(--pj-line);
  color: var(--pj-ink);
}
.pj-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pj-initials {
  font-family: var(--display, "Big Shoulders Display", "Arial Narrow", Impact, sans-serif);
  font-weight: 800;
  font-size: 1.1rem;
  line-height: 1;
}
.pj-person-text { min-width: 0; }
.pj-person-name { font-weight: 600; font-size: 0.92rem; line-height: 1.25; overflow-wrap: anywhere; color: var(--pj-ink); }
.pj-person-name a { color: inherit; text-decoration: none; }
.pj-person-name a:hover { text-decoration: underline; text-underline-offset: 3px; }
.pj-lead {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.06rem 0.45rem;
  background: var(--pj-ink);
  color: #fff;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  vertical-align: 0.1em;
}
.pj-person-role { font-size: 0.82rem; line-height: 1.3; color: var(--pj-muted); }

/* LinkedIn icon, pushed to the right edge of the member's row */
.pj-social {
  flex: none;
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: var(--pj-ink);
  transition: background-color 0.25s, color 0.25s;
}
.pj-social svg { width: 1.1rem; height: 1.1rem; }
.pj-social:hover { background: var(--pj-ink); color: #fff; }
.pj-social:focus-visible { outline: 3px solid var(--pj-accent); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .js .pj-card { opacity: 1; transform: none; }
  .pj-card, .pj-media img, .pj-link, .pj-social { transition: none; }
  .pj-card:hover .pj-media img { transform: none; }
}
`;

(async () => {
  const host = document.getElementById("project-list");
  if (!host) return;

  // Add the styles once.
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

  const ARROW =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  const LINKEDIN =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3V9.75zM9.5 9.75h3.8v1.6h.06c.53-1 1.82-2.05 3.75-2.05 4 0 4.74 2.63 4.74 6.05V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.32-1.96 2.69V21h-4V9.75z"/></svg>';

  // Fills a frame with a person's photo, or their initials if there is no photo or it fails to load.
  function fillPhoto(frame, person) {
    const showInitials = () => {
      frame.textContent = "";
      frame.appendChild(el("span", "pj-initials", initials(person.name || "?")));
    };
    if (!person.photo) return showInitials();
    const img = document.createElement("img");
    img.src = person.photo;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", showInitials);
    frame.appendChild(img);
  }

  let projects = [];

  try {
    const response = await fetch("data/projects.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status);
    projects = (await response.json()).projects || [];
  } catch (error) {
    host.replaceWith(
      el("p", "empty", "The projects list could not load. Please open the site using npm start.")
    );
    return;
  }

  if (!projects.length) {
    host.appendChild(el("p", "empty", "Our projects will be listed here soon. Check back for updates!"));
    return;
  }

  const list = el("div", "pj-list");

  projects.forEach((project) => {
    const card = el("article", "pj-card");

    /* ---- Picture ---- */
    const media = el("div", "pj-media");
    const showPlaceholder = () => {
      media.textContent = "";
      media.classList.add("is-empty");
      media.appendChild(el("span", "pj-media-placeholder", "AIAA"));
    };

    if (project.image) {
      // Optional: "imagePosition": "center 30%" in projects.json moves which part of the picture is shown.
      if (project.imagePosition) media.style.setProperty("--pj-pos", project.imagePosition);
      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.imageAlt || project.name;
      img.loading = "lazy";
      img.addEventListener("error", showPlaceholder);
      media.appendChild(img);
    } else {
      showPlaceholder();
    }

    /* ---- Text ---- */
    const body = el("div", "pj-body");

    const head = el("div", "pj-head");
    head.appendChild(el("h3", "pj-name", project.name));
    const meta = el("div", "pj-meta");
    if (project.department) meta.appendChild(el("span", "pj-dept", project.department));
    if (project.status) meta.appendChild(el("span", "pj-status", project.status));
    if (meta.children.length) head.appendChild(meta);
    body.appendChild(head);

    if (project.description) body.appendChild(el("p", "pj-desc", project.description));

    if (project.url) {
      const link = el("a", "pj-link");
      link.href = project.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Learn more about ${project.name}`);
      link.appendChild(document.createTextNode("Learn More"));
      link.insertAdjacentHTML("beforeend", ARROW);
      body.appendChild(link);
    }

    /* ---- Team, at the bottom (project leads first) ---- */
    const team = (project.team || []).filter((p) => p && p.name);
    if (team.length) {
      const section = el("section", "pj-team");
      section.setAttribute("aria-label", `${project.name} team`);
      section.appendChild(el("h4", "pj-team-title", "Team"));

      const people = el("ul", "pj-people");
      [...team]
        .sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0))
        .forEach((person) => {
          const li = el("li", "pj-person");

          const avatar = el("div", "pj-avatar");
          fillPhoto(avatar, person);

          const text = el("div", "pj-person-text");
          const nameLine = el("div", "pj-person-name");
          if (person.linkedin) {
            const a = el("a", "", person.name);
            a.href = person.linkedin;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.setAttribute("aria-label", `${person.name} on LinkedIn`);
            nameLine.appendChild(a);
          } else {
            nameLine.appendChild(el("span", "", person.name));
          }
          if (person.lead) nameLine.appendChild(el("span", "pj-lead", "Lead"));
          text.appendChild(nameLine);
          if (person.role) text.appendChild(el("div", "pj-person-role", person.role));

          li.append(avatar, text);

          // LinkedIn icon on the right side of the row (only when the person has a link)
          if (person.linkedin) {
            const social = el("a", "pj-social");
            social.href = person.linkedin;
            social.target = "_blank";
            social.rel = "noopener noreferrer";
            social.setAttribute("aria-label", `${person.name} on LinkedIn`);
            social.innerHTML = LINKEDIN;
            li.appendChild(social);
          }

          people.appendChild(li);
        });

      section.appendChild(people);
      body.appendChild(section);
    }

    card.append(media, body);
    list.appendChild(card);
  });

  host.appendChild(list);

  /* ---- Gentle reveal as each card scrolls into view ---- */
  const cards = list.querySelectorAll(".pj-card");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    cards.forEach((c) => io.observe(c));
  } else {
    cards.forEach((c) => c.classList.add("is-in"));
  }

  if (window.ScrollTrigger) ScrollTrigger.refresh();
})();