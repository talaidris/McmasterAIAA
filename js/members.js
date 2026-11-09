/* Builds the McMaster AIAA organizational chart and member list. */

(async () => {
  const orgChart = document.getElementById("org-chart");
  const memberList = document.getElementById("member-list");

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  const SILHOUETTE = `
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <circle cx="50" cy="36" r="17"/>
      <path d="M14 96c0-22 16-36 36-36s36 14 36 36z"/>
    </svg>
  `;

  function createPersonCard(person, extraClass = "") {
    const personClass = (person.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const card = el("div", `org-person ${extraClass} person-${personClass}`);

    const photo = el("div", "org-photo");

    if (person.photo) {
      const img = document.createElement("img");
      img.src = person.photo;
      img.alt = "";
      img.loading = "lazy";

      img.addEventListener("error", () => {
        img.remove();
        photo.innerHTML = SILHOUETTE;
      });

      photo.appendChild(img);
    } else {
      photo.innerHTML = SILHOUETTE;
    }

    const info = el("div", "org-info");
    info.appendChild(el("strong", "org-name", person.name));
    info.appendChild(el("span", "org-role", person.role || ""));

    if (person.program) {
      info.appendChild(el("span", "org-meta", person.program));
    }

    card.append(photo, info);

    if (person.linkedin) {
      const link = document.createElement("a");

      link.className = "org-linkedin";
      link.href = person.linkedin;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      link.setAttribute("aria-label", `${person.name} on LinkedIn`);

      link.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96
            C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68
            1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93
            18.5H4.95V9h2.98v9.5ZM6.44 7.7a1.73 1.73 0
            1 1 0-3.46 1.73 1.73 0 0 1 0 3.46ZM19.05
            18.5h-2.97v-4.62c0-1.1-.02-2.52-1.54-2.52
            -1.54 0-1.78 1.2-1.78 2.44v4.7H9.79V9h2.85v1.3h.04
            c.4-.75 1.37-1.54 2.82-1.54 3.01 0 3.56
            1.98 3.56 4.56v5.18Z"
          />
        </svg>
      `;

      info.appendChild(link);
    }

    return card;
  }

  let data;

  try {
    const response = await fetch("data/members.json", {
      cache: "no-cache"
    });

    if (!response.ok) throw new Error(response.status);

    data = await response.json();
  } catch (error) {
    orgChart.replaceWith(
      el("p", "empty", "The organizational chart could not load. Please open the site using npm start.")
    );

    if (memberList) memberList.replaceWith(el("span"));
    return;
  }

  // Top: Vice Chair (left) and Chair (right)
  const leadership = el("div", "org-leadership");
  leadership.appendChild(createPersonCard(data.chair, "org-chair"));
  leadership.appendChild(createPersonCard(data.viceChair, "org-vice-chair"));
  orgChart.appendChild(leadership);

  // Faculty Advisor in the middle, flanked by the secretaries
  const advisorArea = el("div", "org-advisor-area");
  const advisorRow = el("div", "org-advisor-row");

   advisorRow.appendChild(createPersonCard(data.advisor, "org-advisor"));
  (data.secretaries || []).forEach((person) => {
    advisorRow.appendChild(createPersonCard(person, "org-secretary"));
  });

  advisorArea.appendChild(advisorRow);
  orgChart.appendChild(advisorArea);

  // Department branches
  const departments = el("div", "org-departments");

  (data.departments || []).forEach((department) => {
    const branch = el("div", "org-branch");

    branch.appendChild(
      el("h3", "org-department-title", department.name)
    );

    const people = el("div", "org-people");

    (department.members || []).forEach((person) => {
      people.appendChild(createPersonCard(person));
    });

    branch.appendChild(people);
    departments.appendChild(branch);
  });

  orgChart.appendChild(departments);

  // General members (only if the page has a #member-list)
  if (memberList) {
    (data.members || []).forEach((member) => {
      const item = el("li", "member-item");

      const avatar = el("div", "m-avatar");

      const initials = (member.name || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

      if (member.photo) {
        const img = document.createElement("img");
        img.src = member.photo;
        img.alt = "";
        img.loading = "lazy";

        img.addEventListener("error", () => {
          img.remove();
          avatar.textContent = initials;
        });

        avatar.appendChild(img);
      } else {
        avatar.textContent = initials;
      }

      item.append(
        avatar,
        el("strong", "", member.name),
        el("span", "", member.program || "")
      );

      memberList.appendChild(item);
    });
  }

  if (window.ScrollTrigger) {
    ScrollTrigger.refresh();
  }
})();