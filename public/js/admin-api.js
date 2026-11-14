/* Shared admin helpers: token storage + authenticated fetch */
const KEY = "xuv7xo-admin-token";

export const getToken = () => { try{ return localStorage.getItem(KEY) || ""; }catch{ return ""; } };
export const setToken = t => { try{ t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); }catch{} };

export class AuthError extends Error {}

export async function api(path, { method = "GET", body, raw, type } = {}){
  const headers = { authorization: `Bearer ${getToken()}` };
  let payload;
  if (raw){ payload = raw; headers["content-type"] = type; }
  else if (body !== undefined){ payload = JSON.stringify(body); headers["content-type"] = "application/json"; }
  const res = await fetch(path, { method, headers, body: payload, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error || "Login required");
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function login(password){
  const res = await fetch("/api/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  setToken(data.token);
  return data;
}

export const shareUrl = id => `${location.origin}/p/${id}`;

export async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch{
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

/* Resize + convert to WebP in the browser before upload (keeps blobs small). */
export async function compressImage(file, maxSide = 2200, quality = 0.86){
  if (file.type === "image/svg+xml") return { blob: file, type: file.type };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const toBlob = (t, q) => new Promise(r => canvas.toBlob(r, t, q));
  let blob = await toBlob("image/webp", quality);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", quality);
  return { blob, type: blob.type };
}

export async function uploadImage(file){
  const { blob, type } = await compressImage(file);
  if (blob.size > 5 * 1024 * 1024) throw new Error("Image is still larger than 5 MB after compression");
  const { url } = await api("/api/upload", { method: "POST", raw: blob, type });
  return url;
}
