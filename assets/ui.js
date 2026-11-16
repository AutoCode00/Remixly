// Small DOM + storage helpers.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Number(n || 0).toLocaleString('en-US');
export const pad = (n, w = 3) => String(n).padStart(w, '0');
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

/** html`...` → DocumentFragment (values are escaped unless wrapped in raw()). */
export const raw = (s) => ({ __raw: String(s) });
export function html(strings, ...vals) {
  const s = strings.reduce((a, str, i) => a + str + (i < vals.length ? val(vals[i]) : ''), '');
  return document.createRange().createContextualFragment(s);
}
const val = (v) => (v == null || v === false ? '' : Array.isArray(v) ? v.map(val).join('') : v.__raw != null ? v.__raw : esc(v));
export const h = (strings, ...vals) => raw(strings.reduce((a, str, i) => a + str + (i < vals.length ? val(vals[i]) : ''), ''));

let toastTimer;
export function toast(msg, kind = '') {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.append(el); }
  el.className = `toast show ${kind}`;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
export async function copy(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(label); return true; }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    toast(ok ? label : 'Copy failed: select and copy manually', ok ? '' : 'err');
    return ok;
  }
}
export function download(name, blobOrText, type = 'text/plain') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** Runs a DOM update inside a view transition when the browser supports it. */
export function viewTransition(fn) {
  if (document.startViewTransition && !reducedMotion()) return document.startViewTransition(fn);
  fn();
  return null;
}
export const slug = (s) => String(s || 'pack').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pack';
