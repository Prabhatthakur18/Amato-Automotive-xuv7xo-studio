/* ==========================================================================
   XUV 7XO proposal page — render engine.
   Produces exactly the markup of the original standalone page, but every
   word and image comes from a proposal JSON object (see /default.json).
   Used by the public viewer (/ and /p/:id) and by the admin editor.
   ========================================================================== */

const ELEMENT_KEYS = ["door", "floor", "dash", "steering", "boot"];
const MARKER_DEFAULTS = [{x:50,y:14},{x:40,y:30},{x:38,y:52},{x:62,y:42},{x:56,y:60},{x:66,y:74}];

const pad = n => String(n).padStart(2, "0");
const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function getPath(obj, path){
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
export function setPath(obj, path, value){
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

export class ProposalPage {
  /**
   * @param {object} data      proposal JSON
   * @param {object} opts      { editable:boolean, onRendered:fn(page) }
   */
  constructor(data, opts = {}){
    this.data = data;
    this.editable = !!opts.editable;
    this.onRendered = opts.onRendered || (() => {});
    this.di = 0;   // active design
    this.ai = 0;   // active angle
    this.main = document.getElementById("main");
    window.addEventListener("resize", () => requestAnimationFrame(() => this.drawSigLines()));
    wireZoomModal();
  }

  /* text helper: escaped value + (in edit mode) a binding to its JSON path */
  t(path, extraAttrs = ""){
    const val = esc(getPath(this.data, path));
    return this.editable ? `<span data-edit="${path}"${extraAttrs}>${val}</span>` : val;
  }

  /* read-only copy of a value shown elsewhere; kept in sync while editing */
  m(path){
    const val = esc(getPath(this.data, path));
    return this.editable ? `<span data-sync="${path}">${val}</span>` : val;
  }

  slotHTML(path, label, cls = ""){
    const src = getPath(this.data, path) || "";
    const ph = src
      ? `<b>${esc(label)}</b>`
      : `<b>${esc(label)}</b><i>${this.editable ? "no image — click Replace" : "image coming soon"}</i>`;
    return `<div class="slot ${cls}" data-src="${esc(src)}" data-alt="${esc(label)}" data-img-path="${path}">
      <div class="ph">${ph}</div>
    </div>`;
  }

  calloutHTML(c, i, dp){
    return `<div class="callout" data-i="${i}">
      <div class="cbody">
        <div class="cthumb" style="--thumb-pos:50% 50%;--thumb-scale:1">${this.slotHTML(`${dp}.callouts.${i}.img`, c.t)}</div>
        <div class="ctext">
          <span class="cnum">${pad(i + 1)}</span>
          <span class="ct">${this.t(`${dp}.callouts.${i}.t`)}</span>
          <span class="cd">${this.t(`${dp}.callouts.${i}.d`)}</span>
        </div>
      </div>
      <span class="anchor" id="an${i}"></span>
    </div>`;
  }

  renderChrome(){
    const b = this.data.brand || {};
    const logo = (id, src, alt, path) =>
      `<img alt="${alt}" src="${esc(src)}" data-logo-path="${path}"/>`;
    document.getElementById("logoAmato").innerHTML = logo("l", b.logoLeft, "Amato Automotive", "brand.logoLeft");
    document.getElementById("logoMahindra").innerHTML = logo("r", b.logoRight, "Mahindra", "brand.logoRight");
    document.querySelector(".footer-logo.amato").innerHTML = logo("l", b.logoLeft, "Amato Automotive", "brand.logoLeft");
    document.querySelector(".footer-logo.mahindra").innerHTML = logo("r", b.logoRight, "Mahindra", "brand.logoRight");
    document.title = `${this.data.vehicle} — Amato Automotive × Mahindra`;
  }

  render(){
    const D = this.data, d = D.designs[this.di], dp = `designs.${this.di}`;
    const L = D.labels, S = D.sections, ai = this.ai;
    this.renderChrome();

    this.main.innerHTML = `
    <!-- masthead -->
    <div class="masthead rv">
      <div>
        <h2>${this.t(`${dp}.name`)}${d.tm ? "<sup>™</sup>" : ""}</h2>
        <div class="sub"><span class="rule"></span><span class="lbl-dim">${this.m("labels.themeLabel")} — ${this.m(`${dp}.theme`)} · ${this.m("vehicle")}</span></div>
      </div>
      <div class="mast-right">
        ${D.designs.length > 1 ? `<div class="dtabs" role="tablist" aria-label="Designs">
          ${D.designs.map((x, i) => `<button class="dtab ${i === this.di ? "active" : ""}" data-i="${i}">Design ${pad(i + 1)}</button>`).join("")}
        </div>` : ""}
        <p>${this.t(`${dp}.desc`)}</p>
      </div>
    </div>

    <div class="meta-strip rv">
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.themeLabel")}</h4><div class="theme-name">${this.t(`${dp}.theme`)}</div></div>
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.vehicleLabel")}</h4><div class="theme-name">${this.t("vehicle")}</div></div>
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.paletteLabel")}</h4>
        <div class="swatches">${d.palette.map((p, i) => `<div class="swatch" data-sw="${i}"><div class="chip" style="background:${esc(p.hex)}"></div><span>${this.t(`${dp}.palette.${i}.label`)}</span></div>`).join("")}</div>
      </div>
    </div>

    <!-- 01 · complete interior -->
    <section class="interior rv">
      <div class="sec-head">
        <span class="num">01</span>
        <div class="titles"><h3>${this.t("sections.interior.title")}</h3><span>${this.t("sections.interior.sub")}</span></div>
        <span class="rule"></span>
      </div>
      <div class="angle-stage" id="angleStage">
        ${D.angles.map((a, i) => this.slotHTML(`${dp}.images.angle${i + 1}`, a.name, i === ai ? "on" : "")).join("")}
        <div class="angle-hud"><span class="lbl" id="angleName">${this.t(`angles.${ai}.name`)}</span><span id="angleSub">${this.t(`angles.${ai}.sub`)}</span></div>
        <div class="angle-count" id="angleCount"><b>${pad(ai + 1)}</b> / ${pad(D.angles.length)}</div>
      </div>
      <div class="angle-thumbs">
        ${D.angles.map((a, i) => `
          <button class="angle-thumb ${i === ai ? "on" : ""}" data-i="${i}">
            <div class="tmeta"><span class="tnum">${pad(i + 1)}</span><span class="tname">${this.m(`angles.${i}.name`)}</span></div>
          </button>`).join("")}
      </div>
    </section>

    <!-- 02 · signature seat cover : annotated diagram -->
    <section class="signature rv">
      <div class="sec-head">
        <span class="num">02</span>
        <div class="titles"><h3>${this.t("sections.signature.title")}</h3><span>${this.t("sections.signature.sub")}</span></div>
        <span class="rule"></span>
      </div>
      <div class="sig-wrap" id="sigWrap">
        <svg class="sig-lines" id="sigLines" aria-hidden="true"></svg>
        <div class="sig-cols">
          <div class="sig-side left" id="sigLeft">
            ${d.callouts.slice(0, 3).map((c, i) => this.calloutHTML(c, i, dp)).join("")}
          </div>
          <div class="sig-stage" id="sigStage">
            ${this.slotHTML(`${dp}.images.seat`, "Seat Cover")}
            <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>
            ${d.callouts.map((c, i) => {
              const p = c.pos || MARKER_DEFAULTS[i % MARKER_DEFAULTS.length];
              return `<span class="marker" id="mk${i}" data-i="${i}" style="left:${+p.x}%;top:${+p.y}%">
                <span class="ring"></span><span class="core"></span><span class="mnum">${pad(i + 1)}</span>
              </span>`;
            }).join("")}
            <div class="sig-tag">${this.m("vehicle")} · <b>${this.m(`${dp}.name`)}</b> · ${this.t("labels.seatTag")}</div>
          </div>
          <div class="sig-side right" id="sigRight">
            ${d.callouts.slice(3, 6).map((c, i) => this.calloutHTML(c, i + 3, dp)).join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- 03 · cabin elements -->
    <section class="elements rv">
      <div class="sec-head">
        <span class="num">03</span>
        <div class="titles"><h3>${this.t("sections.elements.title")}</h3><span>${this.t("sections.elements.sub")}</span></div>
        <span class="rule"></span>
      </div>
      <div class="el-grid">
        ${[...ELEMENT_KEYS, "rear"].map((k, i) => `<div class="el-card">
            <span class="corner"></span>
            ${this.slotHTML(`${dp}.images.${k}`, D.elementLabels[k])}
            <div class="el-meta"><span class="enum">${pad(i + 1)}</span><div><h5>${this.t(`elementLabels.${k}`)}</h5></div></div>
          </div>`).join("")}
      </div>
    </section>
    `;

    this.wire();
    this.onRendered(this);
  }

  wire(){
    const main = this.main;

    /* design tabs */
    main.querySelectorAll(".dtab").forEach(b => b.onclick = () => {
      this.di = +b.dataset.i; this.ai = 0; this.render();
    });

    /* angle switcher */
    main.querySelectorAll(".angle-thumb").forEach(t => t.onclick = () => this.setAngle(+t.dataset.i));

    /* signature diagram: leader lines + hover linking */
    this.drawSigLines();
    main.querySelectorAll(".callout[data-i]").forEach(c => {
      const i = +c.dataset.i;
      const mk = document.getElementById("mk" + i);
      const line = () => document.getElementById("ln" + i);
      const link = () => { mk.classList.add("hot"); line()?.classList.add("hot"); };
      const unlink = () => { mk.classList.remove("hot"); line()?.classList.remove("hot"); };
      c.addEventListener("mouseenter", link);
      c.addEventListener("mouseleave", unlink);
      mk.addEventListener("mouseenter", () => { c.classList.add("hot"); link(); });
      mk.addEventListener("mouseleave", () => { c.classList.remove("hot"); unlink(); });
    });

    this.hydrateSlots(main);

    /* reveal on scroll */
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: .12 });
    main.querySelectorAll(".rv").forEach(el => io.observe(el));
  }

  setAngle(i){
    this.ai = i;
    const main = this.main, D = this.data;
    main.querySelectorAll("#angleStage .slot").forEach((s, j) => s.classList.toggle("on", j === i));
    main.querySelectorAll(".angle-thumb").forEach((x, j) => x.classList.toggle("on", j === i));
    const name = document.getElementById("angleName"), sub = document.getElementById("angleSub");
    name.innerHTML = this.t(`angles.${i}.name`);
    sub.innerHTML = this.t(`angles.${i}.sub`);
    document.getElementById("angleCount").innerHTML = `<b>${pad(i + 1)}</b> / ${pad(D.angles.length)}`;
    this.onRendered(this, { partial: true, root: document.querySelector(".angle-hud") });
  }

  hydrateSlots(root){
    root.querySelectorAll(".slot[data-src]").forEach(slot => this.loadSlot(slot));
  }

  /* (re)load the image of one slot from its data-src */
  loadSlot(slot){
    slot.querySelector(":scope > img")?.remove();
    slot.querySelector(":scope > .zoom-btn")?.remove();
    delete slot.dataset.zoomReady;
    slot.classList.remove("has-img");
    const src = slot.dataset.src;
    if (!src) return;
    const img = new Image();
    img.alt = slot.dataset.alt || "";
    img.onload = () => {
      if (slot.dataset.src !== src) return;
      slot.appendChild(img);
      slot.classList.add("has-img");
      wireZoom(slot);
      requestAnimationFrame(() => this.drawSigLines());
    };
    img.src = src;
  }

  drawSigLines(){
    const svg = document.getElementById("sigLines");
    const wrap = document.getElementById("sigWrap");
    if (!svg || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    if (wr.width === 0) return;
    svg.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height}`);
    if (window.matchMedia("(max-width: 1080px)").matches){ svg.innerHTML = ""; return; }
    let html = "";
    document.querySelectorAll(".callout[data-i]").forEach(c => {
      const i = +c.dataset.i;
      const an = document.getElementById("an" + i);
      const mk = document.getElementById("mk" + i);
      if (!an || !mk) return;
      const a = an.getBoundingClientRect(), m = mk.getBoundingClientRect();
      const x1 = a.left - wr.left, y1 = a.top - wr.top;
      const x2 = m.left + m.width / 2 - wr.left, y2 = m.top + m.height / 2 - wr.top;
      const midX = x1 + (x2 - x1) * 0.35;
      const hot = mk.classList.contains("hot") ? ' class="hot"' : "";
      html += `<polyline id="ln${i}"${hot} points="${x1},${y1} ${midX},${y1} ${x2},${y2}"/>
               <circle cx="${x1}" cy="${y1}" r="2.5" fill="#b01e2e" opacity=".7"/>`;
    });
    svg.innerHTML = html;
  }
}

/* ===================== image zoom ===================== */
function zoomButtonHTML(){
  return `<button class="zoom-btn" type="button" aria-label="View image large" title="View image large">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"></path></svg>
  </button>`;
}
function openZoom(src, alt = ""){
  const modal = document.getElementById("zoomModal");
  const image = document.getElementById("zoomImage");
  const caption = document.getElementById("zoomCaption");
  if (!modal || !image) return;
  image.src = src; image.alt = alt;
  caption.textContent = alt || "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("zoom-open");
  document.getElementById("zoomClose")?.focus();
}
function closeZoom(){
  const modal = document.getElementById("zoomModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("zoom-open");
}
function wireZoom(host){
  const img = host.querySelector(":scope > img");
  if (!img || host.dataset.zoomReady) return;
  host.dataset.zoomReady = "1";
  host.insertAdjacentHTML("beforeend", zoomButtonHTML());
  const btn = host.querySelector(".zoom-btn");
  btn?.addEventListener("click", e => { e.stopPropagation(); openZoom(img.currentSrc || img.src, img.alt); });
  img.addEventListener("dblclick", () => openZoom(img.currentSrc || img.src, img.alt));
}
let zoomWired = false;
function wireZoomModal(){
  if (zoomWired) return; zoomWired = true;
  document.getElementById("zoomClose")?.addEventListener("click", closeZoom);
  document.getElementById("zoomModal")?.addEventListener("click", e => { if (e.target.id === "zoomModal") closeZoom(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeZoom(); });
}
