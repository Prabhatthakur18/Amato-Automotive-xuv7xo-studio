/* ==========================================================================
   "Download HTML": builds a single self-contained offline file of a proposal
   in the browser — styles, page script and every image embedded — so it opens
   by double-click with no internet (e.g. linked from a PowerPoint slide).
   ========================================================================== */
import { normalize } from "./model.js";

const IMAGE_KEYS = /^(img|logoLeft|logoRight)$/;

const safeScript = s => s.replace(/<\/(script)/gi, "<\\/$1");
export const fileName = title =>
  (String(title || "proposal").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "proposal") + ".html";

async function text(url){
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Couldn't load ${url} (${r.status})`);
  return r.text();
}

async function toDataUri(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Couldn't load image ${url} (${r.status})`);
  const blob = await r.blob();
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}

/* collect every image reference in the content */
function imageRefs(o, out = []){
  if (Array.isArray(o)) o.forEach(x => imageRefs(x, out));
  else if (o && typeof o === "object"){
    for (const [k, v] of Object.entries(o)){
      if (typeof v === "string" && IMAGE_KEYS.test(k)) { if (v) out.push([o, k]); }
      else imageRefs(v, out);
    }
  }
  return out;
}

/**
 * Build the offline HTML string.
 * @param {object} content   proposal content (any schema)
 * @param {function} onProgress  (done, total) => void
 */
export async function buildOfflineHtml(content, onProgress = () => {}){
  const data = normalize(JSON.parse(JSON.stringify(content)));

  const refs = imageRefs(data).filter(([o, k]) => !o[k].startsWith("data:"));
  const unique = [...new Set(refs.map(([o, k]) => o[k]))];
  const map = new Map();
  let done = 0;
  onProgress(0, unique.length);
  const queue = [...unique];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length){
      const u = queue.shift();
      map.set(u, await toDataUri(u));
      onProgress(++done, unique.length);
    }
  }));
  refs.forEach(([o, k]) => { o[k] = map.get(o[k]); });

  const [shell, css, runtime] = await Promise.all([
    text("/index.html"), text("/css/site.css"), text("/js/offline-runtime.js"),
  ]);
  const cssInline = css.replace(/@font-face\s*{[^}]*}/g, "");   // font files aren't bundled

  return shell
    .replace('<link href="/css/site.css" rel="stylesheet"/>', () => `<style>${cssInline}</style>`)
    .replace(/src="\/assets\/brand\/amato\.png"/g, () => `src="${data.brand.logoLeft}"`)
    .replace(/src="\/assets\/brand\/mahindra\.png"/g, () => `src="${data.brand.logoRight}"`)
    .replace(/<script type="module" src="\/js\/app\.js"><\/script>/, () =>
      `<script>window.__DATA__=${safeScript(JSON.stringify(data))};</script>\n<script>${safeScript(runtime)}</script>`);
}

/* build + trigger the browser download */
export async function downloadOffline(content, title, onProgress){
  const html = await buildOfflineHtml(content, onProgress);
  const blob = new Blob([html], { type: "text/html" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName(title) });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return blob.size;
}

/* ------------------------------ import ------------------------------ */
/* Read the proposal content back out of a file made by "Download HTML". */
export function readOfflineHtml(html){
  const m = html.match(/<script>window\.__DATA__=([\s\S]*?);<\/script>/);
  if (!m) throw new Error("This isn't a proposal file downloaded from this site");
  return normalize(JSON.parse(m[1].replace(/<\\\/(script)/gi, "</$1")));
}

/**
 * Turn embedded images (data: URIs) back into uploaded images so the
 * proposal stays small enough to save. uploadImage(file) → url.
 */
export async function uploadEmbeddedImages(content, uploadImage, onProgress = () => {}){
  const refs = imageRefs(content).filter(([o, k]) => o[k].startsWith("data:"));
  const unique = [...new Set(refs.map(([o, k]) => o[k]))];
  const map = new Map();
  let done = 0;
  onProgress(0, unique.length);
  const queue = [...unique];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length){
      const uri = queue.shift();
      const blob = await (await fetch(uri)).blob();
      map.set(uri, await uploadImage(new File([blob], "image", { type: blob.type })));
      onProgress(++done, unique.length);
    }
  }));
  refs.forEach(([o, k]) => { o[k] = map.get(o[k]); });
  return content;
}
