/* ==========================================================================
   XUV 7XO proposal page — render engine.
   Produces the markup of the original standalone page, driven by proposal
   JSON (schema 2, see model.js). Sections are rendered in order by type:
     gallery → "Complete Interior" angle switcher
     seat    → annotated signature seat diagram
     grid    → "Cabin Elements" cards
   In editable mode it also renders the add / remove / reorder controls
   (buttons with data-cmd, handled by editor.js).
   ========================================================================== */
import { normalize, LIMITS, SECTION_TYPES, listKey, listLimit } from "./model.js";

const MARKER_DEFAULTS = [{x:50,y:14},{x:40,y:30},{x:38,y:52},{x:62,y:42},{x:56,y:60},{x:66,y:74}];

const pad = n => String(n).padStart(2, "0");
export const esc = s => String(s ?? "")
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
   * @param {object} data   proposal content (any schema; normalised to v2)
   * @param {object} opts   { editable:boolean, onRendered:fn(page, opts) }
   */
  constructor(data, opts = {}){
    this.data = normalize(data);
    this.editable = !!opts.editable;
    this.onRendered = opts.onRendered || (() => {});
    this.di = 0;          // active design
    this.ai = {};         // active item per gallery section id
    this.main = document.getElementById("main");
    window.addEventListener("resize", () => requestAnimationFrame(() => this.drawSigLines()));
    wireZoomModal();
  }

  get design(){ return this.data.designs[this.di]; }
  dp(){ return `designs.${this.di}`; }

  /* editable text: escaped value + (edit mode) binding to its JSON path */
  t(path){
    const val = esc(getPath(this.data, path));
    return this.editable ? `<span data-edit="${path}">${val}</span>` : val;
  }
  /* read-only copy of a value shown elsewhere; kept in sync while editing */
  m(path){
    const val = esc(getPath(this.data, path));
    return this.editable ? `<span data-sync="${path}">${val}</span>` : val;
  }
  /* edit-mode control button */
  ctl(cmd, label, attrs = "", cls = "", title = ""){
    if (!this.editable) return "";
    return `<button type="button" class="ed-ctl ${cls}" data-cmd="${cmd}" ${attrs}${title ? ` title="${esc(title)}"` : ""}>${label}</button>`;
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

  renderChrome(){
    const b = this.data.brand || {};
    const logo = (src, alt, path) => `<img alt="${alt}" src="${esc(src)}" data-logo-path="${path}"/>`;
    document.getElementById("logoAmato").innerHTML = logo(b.logoLeft, "Amato Automotive", "brand.logoLeft");
    document.getElementById("logoMahindra").innerHTML = logo(b.logoRight, "Mahindra", "brand.logoRight");
    document.querySelector(".footer-logo.amato").innerHTML = logo(b.logoLeft, "Amato Automotive", "brand.logoLeft");
    document.querySelector(".footer-logo.mahindra").innerHTML = logo(b.logoRight, "Mahindra", "brand.logoRight");
    document.title = `${this.data.vehicle} — Amato Automotive × Mahindra`;
  }

  /* ------------------------------ page ------------------------------ */
  render(){
    const D = this.data, d = this.design, dp = this.dp();
    this.renderChrome();

    const showTabs = D.designs.length > 1 || this.editable;
    const designTools = this.editable ? `<div class="ed-row ed-design-tools">
        ${D.designs.length < LIMITS.designs ? this.ctl("design-add", "+ Add design", "", "", "Copies the current design as a starting point") : ""}
        ${D.designs.length > 1 ? this.ctl("design-move", "◀", `data-dir="-1"`, "", "Move this design left") + this.ctl("design-move", "▶", `data-dir="1"`, "", "Move this design right") : ""}
        ${D.designs.length > 1 ? this.ctl("design-del", "× Delete design", "", "danger") : ""}
      </div>` : "";

    const sections = D.sections.filter(s => this.editable || this.hasContent(s));

    this.main.innerHTML = `
    <!-- masthead -->
    <div class="masthead rv">
      <div>
        <h2>${this.t(`${dp}.name`)}${d.tm ? "<sup>™</sup>" : ""}</h2>
        <div class="sub"><span class="rule"></span><span class="lbl-dim">${this.m("labels.themeLabel")} — ${this.m(`${dp}.theme`)} · ${this.m("vehicle")}</span></div>
      </div>
      <div class="mast-right">
        ${showTabs ? `<div class="dtabs" role="tablist" aria-label="Designs">
          ${D.designs.map((x, i) => `<button class="dtab ${i === this.di ? "active" : ""}" data-i="${i}">Design ${pad(i + 1)}</button>`).join("")}
        </div>` : ""}
        ${designTools}
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

    ${this.addSectionRow(0, sections.length === 0)}
    ${sections.map((s, n) => this.sectionHTML(s, n) + this.addSectionRow(D.sections.indexOf(s) + 1)).join("")}
    `;

    this.wire();
    this.onRendered(this);
  }

  /* does this section have anything to show a customer? */
  hasContent(s){
    const b = this.design.blocks[s.id];
    if (!b) return false;
    if (s.type === "seat") return !!b.img || b.callouts.length > 0;
    return b.items.length > 0;
  }

  addSectionRow(at, always = false){
    if (!this.editable || this.data.sections.length >= LIMITS.sections) return "";
    if (at === 0 && !always) return "";
    return `<div class="ed-add-sec">
      <span>+ Add section here</span>
      ${Object.entries(SECTION_TYPES).map(([type, v]) =>
        this.ctl("sec-add", v.label, `data-type="${type}" data-at="${at}"`, "", v.hint)).join("")}
    </div>`;
  }

  secHead(s, n){
    const si = this.data.sections.indexOf(s);
    const last = this.data.sections.length - 1;
    const tools = this.editable ? `<div class="ed-sec-tools">
        <span class="ed-sec-type">${SECTION_TYPES[s.type].label}</span>
        ${si > 0 ? this.ctl("sec-move", "↑", `data-sid="${s.id}" data-dir="-1"`, "", "Move section up") : ""}
        ${si < last ? this.ctl("sec-move", "↓", `data-sid="${s.id}" data-dir="1"`, "", "Move section down") : ""}
        ${this.ctl("sec-del", "× Delete section", `data-sid="${s.id}"`, "danger")}
      </div>` : "";
    return `<div class="sec-head">
        <span class="num">${pad(n + 1)}</span>
        <div class="titles"><h3>${this.t(`sections.${si}.title`)}</h3><span>${this.t(`sections.${si}.sub`)}</span></div>
        <span class="rule"></span>
        ${tools}
      </div>`;
  }

  sectionHTML(s, n){
    const cls = { gallery: "interior", seat: "signature", grid: "elements" }[s.type];
    const body = { gallery: () => this.galleryHTML(s), seat: () => this.seatHTML(s), grid: () => this.gridHTML(s) }[s.type]();
    return `<section class="${cls} rv" data-sid="${s.id}">${this.secHead(s, n)}${body}</section>`;
  }

  /* item tools: move left/right + delete (edit mode) */
  itemTools(s, i, count, delLabel = "×"){
    if (!this.editable) return "";
    const a = `data-sid="${s.id}" data-i="${i}"`;
    return `<div class="ed-item-tools">
      ${i > 0 ? this.ctl("item-move", "◀", `${a} data-dir="-1"`, "", "Move earlier") : ""}
      ${i < count - 1 ? this.ctl("item-move", "▶", `${a} data-dir="1"`, "", "Move later") : ""}
      ${this.ctl("item-del", delLabel, a, "danger", "Delete")}
    </div>`;
  }
  addItemBtn(s, label, cls = ""){
    if (!this.editable) return "";
    const b = this.design.blocks[s.id];
    if (b[listKey(s.type)].length >= listLimit(s.type)) return "";
    return this.ctl("item-add", label, `data-sid="${s.id}"`, cls);
  }

  /* ---- gallery: angle switcher ---- */
  galleryHTML(s){
    const bp = `${this.dp()}.blocks.${s.id}`;
    const items = this.design.blocks[s.id].items;
    const n = items.length;
    let ai = Math.min(this.ai[s.id] || 0, Math.max(0, n - 1));
    this.ai[s.id] = ai;
    if (!n){
      return `<div class="ed-empty">No views in this gallery yet. ${this.addItemBtn(s, "+ Add view")}</div>`;
    }
    return `
      <div class="angle-stage" data-gallery="${s.id}">
        ${items.map((a, i) => this.slotHTML(`${bp}.items.${i}.img`, a.name, i === ai ? "on" : "")).join("")}
        <div class="angle-hud"><span class="lbl" data-hud="name">${this.t(`${bp}.items.${ai}.name`)}</span><span data-hud="sub">${this.t(`${bp}.items.${ai}.sub`)}</span></div>
        <div class="angle-count" data-hud="count"><b>${pad(ai + 1)}</b> / ${pad(n)}</div>
      </div>
      <div class="angle-thumbs" style="--n:${n}">
        ${items.map((a, i) => this.editable
          /* editor: a div (text inside a <button> can't be edited); the name itself is editable */
          ? `<div class="angle-thumb ${i === ai ? "on" : ""}" data-i="${i}" role="button" tabindex="0">
            <div class="tmeta"><span class="tnum">${pad(i + 1)}</span><span class="tname">${this.t(`${bp}.items.${i}.name`)}</span></div>
          </div>`
          : `<button class="angle-thumb ${i === ai ? "on" : ""}" data-i="${i}">
            <div class="tmeta"><span class="tnum">${pad(i + 1)}</span><span class="tname">${this.m(`${bp}.items.${i}.name`)}</span></div>
          </button>`).join("")}
      </div>
      ${this.editable ? `<div class="ed-row ed-gallery-tools">
        ${this.addItemBtn(s, "+ Add view")}
        <span class="ed-note">Selected view:</span>
        ${this.itemTools(s, ai, n, "× Delete view")}
      </div>` : ""}`;
  }

  /* ---- seat diagram ---- */
  calloutHTML(s, c, i, n){
    const bp = `${this.dp()}.blocks.${s.id}`;
    return `<div class="callout" data-i="${i}">
      <div class="cbody">
        <div class="cthumb" style="--thumb-pos:50% 50%;--thumb-scale:1">${this.slotHTML(`${bp}.callouts.${i}.img`, c.t)}</div>
        <div class="ctext">
          <span class="cnum">${pad(i + 1)}</span>
          <span class="ct">${this.t(`${bp}.callouts.${i}.t`)}</span>
          <span class="cd">${this.t(`${bp}.callouts.${i}.d`)}</span>
        </div>
        ${this.itemTools(s, i, n)}
      </div>
      <span class="anchor" id="${s.id}-an${i}"></span>
    </div>`;
  }

  seatHTML(s){
    const bp = `${this.dp()}.blocks.${s.id}`;
    const b = this.design.blocks[s.id];
    const cs = b.callouts, n = cs.length, half = Math.ceil(n / 2);
    return `
      <div class="sig-wrap" data-seat="${s.id}">
        <svg class="sig-lines" aria-hidden="true"></svg>
        <div class="sig-cols">
          <div class="sig-side left">
            ${cs.slice(0, half).map((c, i) => this.calloutHTML(s, c, i, n)).join("")}
          </div>
          <div class="sig-stage">
            ${this.slotHTML(`${bp}.img`, "Seat Cover")}
            <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>
            ${cs.map((c, i) => {
              const p = c.pos || MARKER_DEFAULTS[i % MARKER_DEFAULTS.length];
              return `<span class="marker" id="${s.id}-mk${i}" data-i="${i}" style="left:${+p.x}%;top:${+p.y}%">
                <span class="ring"></span><span class="core"></span><span class="mnum">${pad(i + 1)}</span>
              </span>`;
            }).join("")}
            <div class="sig-tag">${this.m("vehicle")} · <b>${this.m(`${this.dp()}.name`)}</b> · ${this.t("labels.seatTag")}</div>
          </div>
          <div class="sig-side right">
            ${cs.slice(half).map((c, i) => this.calloutHTML(s, c, i + half, n)).join("")}
          </div>
        </div>
      </div>
      ${this.editable ? `<div class="ed-row">${this.addItemBtn(s, "+ Add detail")}<span class="ed-note">Drag the numbered dots to place each detail on the seat.</span></div>` : ""}`;
  }

  /* ---- card grid ---- */
  gridHTML(s){
    const bp = `${this.dp()}.blocks.${s.id}`;
    const items = this.design.blocks[s.id].items, n = items.length;
    const add = this.editable && n < LIMITS.grid
      ? `<button type="button" class="el-card ed-add-card" data-cmd="item-add" data-sid="${s.id}"><span>+ Add card</span></button>` : "";
    return `<div class="el-grid">
        ${items.map((it, i) => `<div class="el-card">
            <span class="corner"></span>
            ${this.slotHTML(`${bp}.items.${i}.img`, it.name)}
            <div class="el-meta"><span class="enum">${pad(i + 1)}</span><div><h5>${this.t(`${bp}.items.${i}.name`)}</h5></div>${this.itemTools(s, i, n, "× Delete card")}</div>
          </div>`).join("")}
        ${add}
      </div>`;
  }

  /* ------------------------------ behaviour ------------------------------ */
  wire(){
    const main = this.main;

    main.querySelectorAll(".dtab").forEach(b => b.onclick = () => {
      this.di = +b.dataset.i; this.ai = {}; this.render();
    });

    main.querySelectorAll(".angle-stage[data-gallery]").forEach(stage => {
      const sid = stage.dataset.gallery;
      stage.parentElement.querySelectorAll(".angle-thumb").forEach(t => t.onclick = () => this.setAngle(sid, +t.dataset.i));
    });

    /* seat diagrams: leader lines + hover linking */
    this.drawSigLines();
    main.querySelectorAll(".sig-wrap[data-seat]").forEach(wrap => {
      const sid = wrap.dataset.seat;
      wrap.querySelectorAll(".callout[data-i]").forEach(c => {
        const i = +c.dataset.i;
        const mk = document.getElementById(`${sid}-mk${i}`);
        const line = () => document.getElementById(`${sid}-ln${i}`);
        const link = () => { mk.classList.add("hot"); line()?.classList.add("hot"); };
        const unlink = () => { mk.classList.remove("hot"); line()?.classList.remove("hot"); };
        c.addEventListener("mouseenter", link);
        c.addEventListener("mouseleave", unlink);
        mk.addEventListener("mouseenter", () => { c.classList.add("hot"); link(); });
        mk.addEventListener("mouseleave", () => { c.classList.remove("hot"); unlink(); });
      });
    });

    this.hydrateSlots(main);

    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: .12 });
    main.querySelectorAll(".rv").forEach(el => io.observe(el));
  }

  setAngle(sid, i){
    if (this.editable){ this.ai[sid] = i; return this.render(); }   // re-render so tools target the new view
    this.ai[sid] = i;
    const stage = this.main.querySelector(`.angle-stage[data-gallery="${sid}"]`);
    const sec = stage.parentElement;
    const items = this.design.blocks[sid].items;
    const bp = `${this.dp()}.blocks.${sid}`;
    stage.querySelectorAll(".slot").forEach((s, j) => s.classList.toggle("on", j === i));
    sec.querySelectorAll(".angle-thumb").forEach((x, j) => x.classList.toggle("on", j === i));
    stage.querySelector('[data-hud="name"]').innerHTML = this.t(`${bp}.items.${i}.name`);
    stage.querySelector('[data-hud="sub"]').innerHTML = this.t(`${bp}.items.${i}.sub`);
    stage.querySelector('[data-hud="count"]').innerHTML = `<b>${pad(i + 1)}</b> / ${pad(items.length)}`;
  }

  hydrateSlots(root){
    root.querySelectorAll(".slot[data-src]").forEach(slot => this.loadSlot(slot));
  }

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
    this.main.querySelectorAll(".sig-wrap[data-seat]").forEach(wrap => {
      const sid = wrap.dataset.seat;
      const svg = wrap.querySelector(".sig-lines");
      const wr = wrap.getBoundingClientRect();
      if (wr.width === 0) return;
      svg.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height}`);
      if (window.matchMedia("(max-width: 1080px)").matches){ svg.innerHTML = ""; return; }
      let html = "";
      wrap.querySelectorAll(".callout[data-i]").forEach(c => {
        const i = +c.dataset.i;
        const an = document.getElementById(`${sid}-an${i}`);
        const mk = document.getElementById(`${sid}-mk${i}`);
        if (!an || !mk) return;
        const a = an.getBoundingClientRect(), m = mk.getBoundingClientRect();
        const x1 = a.left - wr.left, y1 = a.top - wr.top;
        const x2 = m.left + m.width / 2 - wr.left, y2 = m.top + m.height / 2 - wr.top;
        const midX = x1 + (x2 - x1) * 0.35;
        const hot = mk.classList.contains("hot") ? ' class="hot"' : "";
        html += `<polyline id="${sid}-ln${i}"${hot} points="${x1},${y1} ${midX},${y1} ${x2},${y2}"/>
                 <circle cx="${x1}" cy="${y1}" r="2.5" fill="#b01e2e" opacity=".7"/>`;
      });
      svg.innerHTML = html;
    });
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
  host.querySelector(".zoom-btn")?.addEventListener("click", e => { e.stopPropagation(); openZoom(img.currentSrc || img.src, img.alt); });
  img.addEventListener("dblclick", () => openZoom(img.currentSrc || img.src, img.alt));
}
let zoomWired = false;
function wireZoomModal(){
  if (zoomWired) return; zoomWired = true;
  document.getElementById("zoomClose")?.addEventListener("click", closeZoom);
  document.getElementById("zoomModal")?.addEventListener("click", e => { if (e.target.id === "zoomModal") closeZoom(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeZoom(); });
}
