/* Turns the admin page's "full write-up" text into safe page elements. Shared by the Events page
   and the admin preview. Nothing is ever inserted as HTML, only as text and real elements.

   What it understands:
     blank line ................ new paragraph (a single Enter is a line break)
     - item  (or * item) ....... bullet list; blank lines between items are fine
     [link text](https://...) .. a link (https:// is added if you leave it out)
     https://example.com ....... a bare web address becomes a link automatically
     **bold** .................. bold text                                                    */
(function () {
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function safeUrl(u) {
    u = String(u).trim();
    if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+([\/?#]\S*)?$/.test(u)) return "https://" + u;
    return null;
  }

  function link(parent, label, url) {
    var href = safeUrl(url);
    if (!href) { parent.appendChild(document.createTextNode(label)); return; }
    var a = el("a", "", label); a.href = href;
    if (!/^mailto:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    parent.appendChild(a);
  }

  function inline(parent, text) {
    var re = /\[([^\]]+)\]\(([^)\s]+)\)|\[((?:https?:\/\/|www\.)[^\]\s]+)\]|(https?:\/\/[^\s<>\]()]+)|\*\*([^*]+)\*\*/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] != null) link(parent, m[1], m[2]);
      else if (m[3] != null) link(parent, m[3], m[3]);
      else if (m[4] != null) {
        var url = m[4].replace(/[.,;:!?]+$/, ""), tail = m[4].slice(url.length);
        link(parent, url, url); if (tail) parent.appendChild(document.createTextNode(tail));
      } else parent.appendChild(el("strong", "", m[5]));
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  /* opts.plainList: lists with no bullet markers (the look of the Kickoff recap) */
  window.renderWriteUp = function (parent, text, opts) {
    opts = opts || {};
    var para = [], items = null;
    function flushPara() {
      if (!para.length) return;
      var p = document.createElement("p");
      para.forEach(function (line, i) { if (i) p.appendChild(document.createElement("br")); inline(p, line); });
      parent.appendChild(p); para = [];
    }
    function flushList() {
      if (!items) return;
      var ul = el("ul", opts.plainList ? "ko-people" : "ev-list");
      items.forEach(function (t) { var li = document.createElement("li"); inline(li, t); ul.appendChild(li); });
      parent.appendChild(ul); items = null;
    }
    String(text || "").replace(/\r/g, "").split("\n").forEach(function (raw) {
      var line = raw.trim(), m = /^[-*\u2022]\s+(.+)$/.exec(line);
      if (m) { flushPara(); (items = items || []).push(m[1]); }
      else if (!line) { flushPara(); }            // a blank line keeps an open list going
      else { flushList(); para.push(line); }
    });
    flushPara(); flushList();
  };
})();
