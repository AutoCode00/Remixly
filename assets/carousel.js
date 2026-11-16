// Carousel slides: an HTML template at 1080×1350 → PNG (html-to-image) → zip (JSZip). Both libraries load on first use.
/* global htmlToImage, JSZip */
import { esc, pad, download, slug } from './ui.js';

const LIBS = {
  htmlToImage: 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
  JSZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
};
const loading = {};
function lib(name) {
  if (window[name]) return Promise.resolve(window[name]);
  return (loading[name] ||= new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), { src: LIBS[name], crossOrigin: 'anonymous', onload: () => res(window[name]), onerror: () => { delete loading[name]; rej(new Error(`Could not load ${name}`)); } });
    document.head.append(s);
  }));
}

export function slideHTML(s, i, n, brand = 'remixly') {
  const dark = i === 0 || i === n - 1;
  return `<div class="slide${dark ? ' dark' : ''}">
    <div class="s-top"><span>${pad(i + 1, 2)} / ${pad(n, 2)}</span><span>${esc(brand)}</span></div>
    <div class="s-mid"><div class="s-bar"></div><h2 class="s-title">${esc(s.title)}</h2>${s.line ? `<p class="s-line">${esc(s.line)}</p>` : ''}</div>
    <div class="s-foot"><span class="s-dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span><span>${i === n - 1 ? 'Save ↓' : 'Swipe →'}</span></div>
  </div>`;
}
export const slideName = (i) => `slide-${pad(i + 1, 2)}.png`;

async function toBlob(node) {
  const h2i = await lib('htmlToImage');
  const opts = { width: 1080, height: 1350, pixelRatio: 1, cacheBust: true, backgroundColor: getComputedStyle(node).backgroundColor };
  try { return await h2i.toBlob(node, opts); }
  catch { return h2i.toBlob(node, { ...opts, skipFonts: true }); } // a font that can't be embedded shouldn't block the download
}
export async function slidePNG(slides, i, brand) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none';
  host.innerHTML = slideHTML(slides[i], i, slides.length, brand);
  document.body.append(host);
  try { await document.fonts.ready; return await toBlob(host.firstElementChild); }
  finally { host.remove(); }
}
export async function downloadSlide(slides, i, brand) {
  download(slideName(i), await slidePNG(slides, i, brand));
}
export async function downloadSlidesZip(slides, title, brand) {
  const Zip = await lib('JSZip');
  const zip = new Zip();
  const dir = zip.folder('carousel');
  for (let i = 0; i < slides.length; i++) dir.file(slideName(i), await slidePNG(slides, i, brand));
  download(`${slug(title)}-carousel.zip`, await zip.generateAsync({ type: 'blob' }));
}
