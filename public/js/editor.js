/* ==========================================================================
   Admin editor — the live page, made editable in place.
   · click any text to edit it
   · hover an image → Replace / Remove
   · drag the numbered seat markers
   · click a colour chip to change it; + / × to add or remove swatches
   · Save (or Ctrl/Cmd+S), then Copy link to share /p/<id>
   ========================================================================== */
import { ProposalPage, setPath, getPath } from "./page.js";
import { newItem, newBlock, newSection, listKey, listLimit, LIMITS, SECTION_TYPES } from "./model.js";
import { api, AuthError, getToken, shareUrl, copyText, uploadImage } from "./admin-api.js";

let page, rec, dirty = false, saving = false;
const $ = s => document.querySelector(s);

export async function startEditor(id){
  if (!getToken()) return toLogin();
  addCss("/css/editor.css");
  document.body.classList.add("editing");
  try{
    rec = await api(`/api/proposals/${id}`);
  }catch(e){
    if (e instanceof AuthError) return toLogin();
    document.getElementById("main").innerHTML =
      `<div class="page-state"><b>Couldn't open proposal</b><span>${e.message}</span></div>`;
    return;
  }
  buildToolbar();
  page = new ProposalPage(rec.content, { editable: true, onRendered: decorate });
  page.render();
  bindGlobalKeys();
}

function toLogin(){
  location.href = `/admin/?next=${encodeURIComponent(location.pathname)}`;
}
function addCss(href){
  document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href }));
}

/* ------------------------------ toolbar ------------------------------ */
function buildToolbar(){
  const bar = document.createElement("div");
  bar.className = "ed-bar";
  bar.innerHTML = `
    <a class="ed-btn ghost" href="/admin/" title="All proposals">← Proposals</a>
    <label class="ed-title"><span>Proposal name</span>
      <input id="edTitle" maxlength="120" value=""/></label>
    <span class="ed-status" id="edStatus">All changes saved</span>
    <div class="ed-actions">
      <button class="ed-btn ghost" id="edOpen" type="button" title="Open the customer view in a new tab">Open link ↗</button>
      <button class="ed-btn ghost" id="edCopy" type="button">Copy share link</button>
      <button class="ed-btn ghost" id="edHtml" type="button" title="Offline file: opens without internet, can be linked from PowerPoint">Download HTML</button>
      <button class="ed-btn primary" id="edSave" type="button">Save</button>
    </div>
    <div class="ed-hint">Click text to edit · hover images to replace · drag seat markers · click colour chips · use + / × / arrows to add, delete and reorder designs, sections, views, details and cards</div>`;
  document.body.appendChild(bar);
  const title = $("#edTitle");
  title.value = rec.title;
  title.addEventListener("input", () => { rec.title = title.value; markDirty(); });
  $("#edSave").onclick = save;
  $("#edCopy").onclick = async () => {
    if (dirty && !(await save())) return;
    await copyText(shareUrl(rec.id));
    toast("Share link copied — " + shareUrl(rec.id));
  };
  $("#edHtml").onclick = async () => {
    if (dirty && !(await save())) return;
    const btn = $("#edHtml"), label = btn.textContent;
    btn.disabled = true;
    try{
      const { downloadOffline } = await import("./export.js");
      const size = await downloadOffline(page.data, rec.title, (d, t) => { btn.textContent = `Preparing ${d}/${t}…`; });
      toast(`Downloaded “${rec.title}.html” (${(size / 1048576).toFixed(1)} MB) — opens offline`);
    }catch(e){ toast("Download failed: " + e.message, true); }
    finally{ btn.disabled = false; btn.textContent = label; }
  };
  $("#edOpen").onclick = async () => {
    if (dirty && !(await save())) return;
    window.open(shareUrl(rec.id), "_blank", "noopener");
  };
}

function markDirty(){
  dirty = true;
  const s = $("#edStatus");
  s.textContent = "Unsaved changes"; s.className = "ed-status warn";
}

async function save(){
  if (saving) return false;
  saving = true;
  const s = $("#edStatus");
  s.textContent = "Saving…"; s.className = "ed-status";
  try{
    rec = { ...rec, ...(await api(`/api/proposals/${rec.id}`, {
      method: "PUT", body: { title: rec.title, content: page.data },
    })), content: page.data };
    dirty = false;
    s.textContent = "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    s.className = "ed-status ok";
    return true;
  }catch(e){
    if (e instanceof AuthError){ toast("Session expired — log in again (your edits stay in this tab)", true); window.open("/admin/", "_blank"); }
    else toast("Save failed: " + e.message, true);
    s.textContent = "Not saved"; s.className = "ed-status warn";
    return false;
  }finally{ saving = false; }
}

function bindGlobalKeys(){
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){ e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", e => { if (dirty){ e.preventDefault(); e.returnValue = ""; } });
}

let toastTimer;
function toast(msg, bad = false){
  let t = $(".ed-toast");
  if (!t){ t = document.createElement("div"); t.className = "ed-toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle("bad", bad); t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}

/* ------------------------- decorate rendered page ------------------------- */
function decorate(pg, opts = {}){
  const root = opts.root || document;
  bindText(root);
  if (opts.partial) return;
  bindImages(document.getElementById("main"));
  bindLogos();
  bindMarkers();
  bindSwatches();
  bindCommands();
}

/* ---- text ---- */
const editableMode = (() => {
  const d = document.createElement("div");
  d.setAttribute("contenteditable", "plaintext-only");
  return d.contentEditable === "plaintext-only" ? "plaintext-only" : "true";
})();

function bindText(root){
  root.querySelectorAll("[data-edit]").forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = "1";
    el.setAttribute("contenteditable", editableMode);
    el.spellcheck = true;
    el.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); el.blur(); } });
    el.addEventListener("paste", e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain").replace(/\s*\n\s*/g, " ");
      document.execCommand("insertText", false, text);
    });
    el.addEventListener("input", () => {
      const path = el.dataset.edit, val = el.textContent;
      setPath(page.data, path, val);
      document.querySelectorAll(`[data-sync="${path}"]`).forEach(m => { m.textContent = val; });
      document.querySelectorAll(`[data-edit="${path}"]`).forEach(o => { if (o !== el) o.textContent = val; });
      markDirty();
      requestAnimationFrame(() => page.drawSigLines());
    });
    el.addEventListener("blur", () => {
      const path = el.dataset.edit;
      const trimmed = el.textContent.replace(/\s+/g, " ").trim();
      if (trimmed !== el.textContent){ el.textContent = trimmed; setPath(page.data, path, trimmed); }
      if (/\.(items\.\d+\.name|callouts\.\d+\.t)$/.test(path)) syncAlts(path, trimmed);
    });
    /* don't let clicks inside text trigger the card/tab underneath */
    el.addEventListener("click", e => e.stopPropagation());
  });
}
function syncAlts(path, val){
  const imgPath = path.replace(/\.(name|t)$/, ".img");
  document.querySelectorAll(`[data-img-path="${imgPath}"]`).forEach(s => {
    s.dataset.alt = val; const img = s.querySelector(":scope > img"); if (img) img.alt = val;
  });
}

/* ---- file picking ---- */
function pickFile(){
  return new Promise(resolve => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}
async function replaceImage(path, onDone){
  const file = await pickFile();
  if (!file) return;
  toast("Uploading image…");
  try{
    const url = await uploadImage(file);
    setPath(page.data, path, url);
    onDone(url);
    markDirty();
    toast("Image replaced — remember to Save");
  }catch(e){
    if (e instanceof AuthError) toast("Session expired — log in again", true);
    else toast("Upload failed: " + e.message, true);
  }
}

/* ---- image slots ---- */
function bindImages(root){
  root.querySelectorAll(".slot[data-img-path]").forEach(slot => {
    if (slot.querySelector(":scope > .ed-img")) return;
    const path = slot.dataset.imgPath;
    const tools = document.createElement("div");
    tools.className = "ed-img";
    tools.innerHTML = `<button type="button" class="ed-img-btn" data-act="replace">Replace image</button>
      <button type="button" class="ed-img-btn x" data-act="remove" title="Remove image">×</button>`;
    slot.appendChild(tools);
    tools.addEventListener("click", e => {
      e.stopPropagation();
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "replace"){
        replaceImage(path, url => document.querySelectorAll(`[data-img-path="${path}"]`).forEach(s => {
          s.dataset.src = url; page.loadSlot(s); updatePh(s);
        }));
      }
      if (act === "remove"){
        if (!confirmRemove()) return;
        setPath(page.data, path, "");
        document.querySelectorAll(`[data-img-path="${path}"]`).forEach(s => { s.dataset.src = ""; page.loadSlot(s); updatePh(s); });
        markDirty();
      }
    });
  });
}
function confirmRemove(){ return window.confirm("Remove this image? The slot will show an empty placeholder."); }
function updatePh(slot){
  const ph = slot.querySelector(".ph");
  if (ph) ph.innerHTML = `<b>${slot.dataset.alt || ""}</b>${slot.dataset.src ? "" : "<i>no image — click Replace</i>"}`;
}

/* ---- logos (header + footer share one value) ---- */
function bindLogos(){
  document.querySelectorAll("img[data-logo-path]").forEach(img => {
    const host = img.parentElement;
    if (host.dataset.edBound) return;
    host.dataset.edBound = "1";
    host.classList.add("ed-logo");
    host.title = "Click to replace logo";
    host.addEventListener("click", e => {
      e.preventDefault();
      const path = img.dataset.logoPath;
      replaceImage(path, url => document.querySelectorAll(`img[data-logo-path="${path}"]`).forEach(i => { i.src = url; }));
    });
  });
}

/* ---- seat markers: drag to reposition ---- */
function bindMarkers(){
  document.querySelectorAll(".sig-wrap[data-seat]").forEach(wrap => {
  const sid = wrap.dataset.seat;
  const stage = wrap.querySelector(".sig-stage");
  stage.querySelectorAll(".marker").forEach(mk => {
    mk.classList.add("ed-drag");
    mk.title = "Drag to move";
    mk.addEventListener("pointerdown", e => {
      e.preventDefault();
      mk.setPointerCapture(e.pointerId);
      const i = +mk.dataset.i;
      const move = ev => {
        const r = stage.getBoundingClientRect();
        const x = Math.min(98, Math.max(2, (ev.clientX - r.left) / r.width * 100));
        const y = Math.min(98, Math.max(2, (ev.clientY - r.top) / r.height * 100));
        const pos = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
        mk.style.left = pos.x + "%"; mk.style.top = pos.y + "%";
        setPath(page.data, `designs.${page.di}.blocks.${sid}.callouts.${i}.pos`, pos);
        page.drawSigLines();
      };
      const up = () => {
        mk.removeEventListener("pointermove", move);
        mk.removeEventListener("pointerup", up);
        mk.removeEventListener("pointercancel", up);
        markDirty();
      };
      mk.addEventListener("pointermove", move);
      mk.addEventListener("pointerup", up);
      mk.addEventListener("pointercancel", up);
    });
  });
  });
}

/* ---- colour palette ---- */
function bindSwatches(){
  const wrap = document.querySelector(".swatches");
  if (!wrap) return;
  const palPath = `designs.${page.di}.palette`;
  const pal = () => getPath(page.data, palPath);

  wrap.querySelectorAll(".swatch").forEach(sw => {
    const i = +sw.dataset.sw;
    const chip = sw.querySelector(".chip");
    chip.classList.add("ed-chip");
    chip.title = "Click to change colour";
    const input = Object.assign(document.createElement("input"), { type: "color", className: "ed-color", value: toHex(pal()[i].hex) });
    chip.appendChild(input);
    input.addEventListener("input", () => {
      pal()[i].hex = input.value; chip.style.background = input.value; markDirty();
    });
    if (pal().length > 1){
      const x = document.createElement("button");
      x.type = "button"; x.className = "ed-sw-x"; x.textContent = "×"; x.title = "Remove colour";
      x.onclick = () => { pal().splice(i, 1); markDirty(); page.render(); };
      sw.appendChild(x);
    }
  });
  if (pal().length < 4){
    const add = document.createElement("button");
    add.type = "button"; add.className = "ed-sw-add"; add.textContent = "+"; add.title = "Add colour";
    add.onclick = () => { pal().push({ hex: "#808080", label: "New colour" }); markDirty(); page.render(); };
    wrap.appendChild(add);
  }
}
function toHex(c){
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + [...c.slice(1)].map(ch => ch + ch).join("");
  return "#808080";
}

/* ---- structure: add / remove / reorder designs, sections and items ---- */
const ITEM_NOUN = { gallery: "view", seat: "detail", grid: "card" };
const clone = o => JSON.parse(JSON.stringify(o));
const swap = (arr, i, j) => { if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

function bindCommands(){
  const main = document.getElementById("main");
  if (main.dataset.cmdBound) return;
  main.dataset.cmdBound = "1";
  main.addEventListener("click", e => {
    const b = e.target.closest("[data-cmd]");
    if (!b || !main.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    runCommand(b.dataset.cmd, b.dataset);
  });
}

function runCommand(cmd, a){
  const D = page.data;
  const design = D.designs[page.di];
  const sec = a.sid ? D.sections.find(s => s.id === a.sid) : null;
  const dir = +a.dir || 0;
  let keepScroll = true;

  switch (cmd){
    case "design-add": {
      if (D.designs.length >= LIMITS.designs) return;
      const copy = clone(design);
      copy.name = `${design.name} copy`;
      D.designs.splice(page.di + 1, 0, copy);
      page.di += 1; page.ai = {};
      toast(`Design ${String(page.di + 1).padStart(2, "0")} added as a copy of “${design.name}” — now change its images and text`);
      break;
    }
    case "design-del": {
      if (D.designs.length <= 1) return;
      if (!confirm(`Delete design “${design.name}” with all its images and text?`)) return;
      D.designs.splice(page.di, 1);
      page.di = Math.max(0, page.di - 1); page.ai = {};
      break;
    }
    case "design-move": {
      if (!swap(D.designs, page.di, page.di + dir)) return;
      page.di += dir;
      break;
    }
    case "sec-add": {
      const s = newSection(a.type);
      D.sections.splice(+a.at, 0, s);
      D.designs.forEach(d => { d.blocks[s.id] = newBlock(a.type); });
      toast(`${SECTION_TYPES[a.type].label} added to every design`);
      break;
    }
    case "sec-del": {
      if (!sec) return;
      if (!confirm(`Delete the section “${sec.title}”? It is removed from ALL designs, with its images and text.`)) return;
      D.sections = D.sections.filter(s => s !== sec);
      D.designs.forEach(d => { delete d.blocks[sec.id]; });
      break;
    }
    case "sec-move": {
      const i = D.sections.indexOf(sec);
      if (!swap(D.sections, i, i + dir)) return;
      keepScroll = false;
      break;
    }
    case "item-add": {
      const list = design.blocks[sec.id][listKey(sec.type)];
      if (list.length >= listLimit(sec.type)) return;
      list.push(newItem(sec.type, list.length));
      if (sec.type === "gallery") page.ai[sec.id] = list.length - 1;
      break;
    }
    case "item-del": {
      const list = design.blocks[sec.id][listKey(sec.type)];
      const i = +a.i, it = list[i];
      if (!confirm(`Delete this ${ITEM_NOUN[sec.type]} (“${it.name ?? it.t}”) from ${design.name}?`)) return;
      list.splice(i, 1);
      if (sec.type === "gallery") page.ai[sec.id] = Math.max(0, i - 1);
      break;
    }
    case "item-move": {
      const list = design.blocks[sec.id][listKey(sec.type)];
      const i = +a.i;
      if (!swap(list, i, i + dir)) return;
      if (sec.type === "gallery") page.ai[sec.id] = i + dir;
      break;
    }
    default: return;
  }
  markDirty();
  rerender(keepScroll, sec?.id);
}

/* re-render and keep the edited section in view */
function rerender(keepScroll, sid){
  const anchor = sid && document.querySelector(`section[data-sid="${sid}"]`);
  const before = anchor ? anchor.getBoundingClientRect().top : null;
  const y = window.scrollY;
  page.render();
  const after = sid && document.querySelector(`section[data-sid="${sid}"]`);
  if (!keepScroll && after){ after.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
  if (after && before !== null) window.scrollTo(0, window.scrollY + after.getBoundingClientRect().top - before);
  else window.scrollTo(0, y);
}
