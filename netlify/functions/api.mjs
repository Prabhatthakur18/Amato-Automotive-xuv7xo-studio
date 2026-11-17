/* ==========================================================================
   XUV 7XO Studio API — one Netlify Function, storage in Netlify Blobs.

   Public
     GET    /api/proposals/:id          proposal content (for /p/:id links)
     GET    /img/:key                   uploaded image
   Admin (Authorization: Bearer <token>)
     POST   /api/login                  { password } -> { token }
     GET    /api/proposals              list
     POST   /api/proposals              { title, from?, content? }  create (copy of `from`, imported content, or master)
     PUT    /api/proposals/:id          { title?, content? }
     DELETE /api/proposals/:id
     POST   /api/upload                 raw image body -> { url }

   Env vars (Site configuration → Environment variables):
     ADMIN_PASSWORD   required — the shared admin password
     SESSION_SECRET   optional — signs login tokens (defaults to ADMIN_PASSWORD)
   ========================================================================== */
import { getStore } from "@netlify/blobs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import master from "../../public/default.json";

export const config = { path: ["/api/*", "/img/*"] };

const TOKEN_DAYS = 30;
const MAX_UPLOAD = 5 * 1024 * 1024;
const IMAGE_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/svg+xml": "svg" };

const proposals = () => getStore({ name: "proposals", consistency: "strong" });
const images = () => getStore({ name: "images", consistency: "strong" });

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
const fail = (status, error) => json({ error }, status);

const newId = (n = 10) => {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  return [...randomBytes(n)].map(b => abc[b % abc.length]).join("");
};

/* ------------------------------ auth ------------------------------ */
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = exp => createHmac("sha256", secret()).update(String(exp)).digest("base64url");

function safeEqual(a, b){
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function isAdmin(req){
  if (!secret()) return false;
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = tok.split(".");
  if (!exp || !sig || Date.now() > +exp) return false;
  return safeEqual(sig, sign(exp));
}

/* --------------------------- index helpers --------------------------- */
async function readIndex(){
  return (await proposals().get("_index", { type: "json" })) || [];
}
async function writeIndex(list){
  list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  await proposals().setJSON("_index", list);
}
const meta = r => ({ id: r.id, title: r.title, vehicle: r.content?.vehicle, createdAt: r.createdAt, updatedAt: r.updatedAt });

/* basic shape check so a bad save can't break a shared page (schema 2, see public/js/model.js) */
function validContent(c){
  if (!c || typeof c !== "object" || c.schema !== 2) return false;
  if (!Array.isArray(c.sections) || !Array.isArray(c.designs) || !c.designs.length) return false;
  if (c.designs.length > 8 || c.sections.length > 10) return false;
  const types = { gallery: "items", seat: "callouts", grid: "items" };
  const ok = c.sections.every(s => s && typeof s.id === "string" && types[s.type]);
  return ok && c.designs.every(d => d && Array.isArray(d.palette) && d.blocks &&
    c.sections.every(s => Array.isArray(d.blocks[s.id]?.[types[s.type]])));
}

/* ------------------------------ handler ------------------------------ */
export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);   // ["api","proposals",":id"]
  const method = req.method;

  try{
    /* ---- uploaded images (public) ---- */
    if (parts[0] === "img"){
      const key = parts[1] || "";
      if (!/^[\w-]+\.(webp|jpg|png|svg)$/.test(key)) return fail(404, "Not found");
      const hit = await images().getWithMetadata(key, { type: "arrayBuffer" });
      if (!hit) return fail(404, "Not found");
      return new Response(hit.data, {
        headers: {
          "content-type": hit.metadata?.type || "application/octet-stream",
          "cache-control": "public, max-age=31536000, immutable",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
          "x-content-type-options": "nosniff",
        },
      });
    }

    const route = parts[1];

    /* ---- login ---- */
    if (route === "login" && method === "POST"){
      if (!process.env.ADMIN_PASSWORD) return fail(500, "ADMIN_PASSWORD is not set on this Netlify site");
      const { password } = await req.json().catch(() => ({}));
      if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) return fail(401, "Wrong password");
      const exp = Date.now() + TOKEN_DAYS * 864e5;
      return json({ token: `${exp}.${sign(exp)}`, expires: exp });
    }

    if (route === "session" && method === "GET"){
      return json({ ok: isAdmin(req) });
    }

    /* ---- proposals ---- */
    if (route === "proposals"){
      const id = parts[2];

      if (id && method === "GET"){
        const rec = await proposals().get(id, { type: "json" });
        if (!rec || id === "_index") return fail(404, "Not found");
        return json(isAdmin(req) ? rec : { id: rec.id, content: rec.content });
      }

      if (!isAdmin(req)) return fail(401, "Login required");

      if (!id && method === "GET") return json(await readIndex());

      if (!id && method === "POST"){
        const body = await req.json().catch(() => ({}));
        let content = structuredClone(master), from = null;
        if (body.content !== undefined){                       // import (e.g. from a downloaded HTML file)
          if (!validContent(body.content)) return fail(400, "Imported content is not a valid proposal");
          content = body.content;
        } else if (body.from){
          from = await proposals().get(body.from, { type: "json" });
          if (!from) return fail(404, "Source proposal not found");
          content = structuredClone(from.content);
        }
        const now = new Date().toISOString();
        const rec = {
          id: newId(),
          title: (body.title || (from ? `${from.title} (copy)` : "Untitled proposal")).slice(0, 120),
          createdAt: now, updatedAt: now, content,
        };
        await proposals().setJSON(rec.id, rec);
        const list = await readIndex();
        list.push(meta(rec));
        await writeIndex(list);
        return json(rec, 201);
      }

      if (id && method === "PUT"){
        const rec = await proposals().get(id, { type: "json" });
        if (!rec) return fail(404, "Not found");
        const body = await req.json().catch(() => null);
        if (!body) return fail(400, "Invalid JSON");
        if (body.content !== undefined){
          if (!validContent(body.content)) return fail(400, "Content is missing required fields");
          rec.content = body.content;
        }
        if (typeof body.title === "string" && body.title.trim()) rec.title = body.title.trim().slice(0, 120);
        rec.updatedAt = new Date().toISOString();
        await proposals().setJSON(id, rec);
        const list = (await readIndex()).filter(m => m.id !== id);
        list.push(meta(rec));
        await writeIndex(list);
        return json(rec);
      }

      if (id && method === "DELETE"){
        await proposals().delete(id);
        await writeIndex((await readIndex()).filter(m => m.id !== id));
        return json({ ok: true });
      }
    }

    /* ---- image upload ---- */
    if (route === "upload" && method === "POST"){
      if (!isAdmin(req)) return fail(401, "Login required");
      const type = (req.headers.get("content-type") || "").split(";")[0].trim();
      const ext = IMAGE_TYPES[type];
      if (!ext) return fail(415, "Upload a WebP, JPEG, PNG or SVG image");
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return fail(400, "Empty upload");
      if (buf.byteLength > MAX_UPLOAD) return fail(413, "Image is larger than 5 MB");
      const key = `${Date.now().toString(36)}-${newId(8)}.${ext}`;
      await images().set(key, buf, { metadata: { type, size: buf.byteLength } });
      return json({ url: `/img/${key}` }, 201);
    }

    return fail(404, "Unknown endpoint");
  }catch(err){
    console.error(err);
    return fail(500, "Server error: " + (err?.message || err));
  }
};
