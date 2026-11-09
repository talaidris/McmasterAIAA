/* Sponsorship form: validates the fields and sends them to Web3Forms,
   which emails every submission to the address the access key was made with.

   SETUP (2 minutes):
   1. Go to web3forms.com and enter mcmaster.aiaa@gmail.com (the sponsorship inbox Danah, Tasha
      and the outreach team can all open). They email you an access key.
   2. Paste that key into ACCESS_KEY below.
   3. In the Web3Forms dashboard, you can add the site's domain and turn on extra spam protection. */

const ACCESS_KEY = "739b223b-c948-4d2d-ade7-f96b377bc8a5";
const ENDPOINT = "https://api.web3forms.com/submit";

(() => {
  const form = document.getElementById("sponsor-form");
  if (!form) return;

  const card = form.closest(".sp-form-card");
  const status = document.getElementById("sp-status");
  const submit = form.querySelector('button[type="submit"]');

  const setError = (container, message) => {
    container.classList.toggle("has-error", Boolean(message));
    const slot = container.querySelector(".sp-error");
    if (slot) slot.textContent = message || "";
  };

  const checkedValues = (name) =>
    [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    let firstBad = null;
    const fail = (node, container, message) => {
      setError(container, message);
      if (!firstBad) firstBad = node;
    };

    // Required text fields
    [
      ["name", "Please enter your full name."],
      ["company", "Please enter your company or organization."],
      ["email", "Please enter your work email."],
      ["message", "Please tell us how you would like to get involved."],
    ].forEach(([id, message]) => {
      const input = form.elements[id];
      const wrap = input.closest(".sp-field");
      const value = input.value.trim();
      if (!value) return fail(input, wrap, message);
      if (id === "email" && !EMAIL.test(value)) {
        return fail(input, wrap, "That email address does not look right.");
      }
      setError(wrap, "");
    });

    // Required checkbox group
    const group = form.querySelector('[data-group="support_type"]');
    if (!checkedValues("support_type").length) {
      fail(group.querySelector("input"), group, "Please choose at least one type of support.");
    } else {
      setError(group, "");
    }

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // Clear an error as soon as the person fixes it.
  form.addEventListener("input", (e) => {
    const wrap = e.target.closest(".sp-field, .sp-group");
    if (wrap && wrap.classList.contains("has-error")) setError(wrap, "");
  });

  const say = (text, kind) => {
    status.textContent = text;
    status.className = "sp-status" + (kind ? " is-" + kind : "");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    say("", "");

    // Spam trap: bots fill every field, people never see this one.
    if (form.elements.botcheck.checked) return;

    if (!validate()) return;

    if (ACCESS_KEY.startsWith("PASTE_")) {
      say("The form is not connected yet. Please email mcmaster.aiaa@gmail.com instead.", "bad");
      return;
    }

    const f = form.elements;
    const payload = {
      access_key: ACCESS_KEY,
      subject: `New sponsorship inquiry from ${f.company.value.trim()}`,
      from_name: "McMaster AIAA Website",
      botcheck: "",
      // "email" is what Web3Forms uses as the reply-to address, so Reply goes to the company.
      email: f.email.value.trim(),
      "Full name": f.name.value.trim(),
      "Company / Organization": f.company.value.trim(),
      "Job title": f.job_title.value.trim() || "Not provided",
      "Type of support": checkedValues("support_type").join(", "),
      "Sponsorship tier of interest": f.tier.value || "Not provided",
      "What they would like to support": checkedValues("support_area").join(", ") || "Not provided",
      "Message": f.message.value.trim(),
    };

    submit.disabled = true;
    say("Sending…", "");

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || response.status);

      card.classList.add("is-sent");
      card.querySelector(".sp-thanks").focus();
      form.reset();
    } catch (error) {
      say(
        "Sorry, something went wrong and your message was not sent. Please try again, or email mcmaster.aiaa@gmail.com.",
        "bad"
      );
    } finally {
      submit.disabled = false;
    }
  });
})();