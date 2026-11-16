// Router (/, /app, /p/:id), the floating top bar + menu, the credits.md footer, Lenis smooth scroll, ⌘K palette, reel modal.
/* global gsap, ScrollTrigger, Lenis */
import { CONFIG } from './config.js';
import { $, $$, esc, fmt, short, toast, copy, reducedMotion } from './ui.js';
import { logo, remi } from './remi.js';
import { initWallet, onWallet, connect, switchChain, onRightChain, hasMetaMask, NET, LIVE, MAINNET_ADDRESS, explorerAddress, registry, txMessage } from './chain.js';

const BASE = window.__BASE || '/';
export const href = (path = '') => BASE + String(path).replace(/^\//, '');
export const routePath = () => decodeURIComponent(location.pathname).slice(BASE.length).replace(/\/+$/, '');

if (window.gsap) {
  gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.Flip].filter(Boolean));
}

// ---------- Lenis ----------
let lenis = null;
function startLenis() {
  if (lenis || reducedMotion() || !window.Lenis) return;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
}
const lenisRaf = (t) => lenis?.raf(t * 1000);
function stopLenis() { if (!lenis) return; gsap.ticker.remove(lenisRaf); lenis.destroy(); lenis = null; }
export function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -20 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

// ---------- router ----------
let current = null;
async function render() {
  const path = routePath();
  current?.cleanup?.();
  window.ScrollTrigger?.getAll().forEach((t) => t.kill());
  const view = $('#view');
  view.replaceChildren();
  closeMenu();
  let mod, params = {};
  if (path === '') mod = await import('./home.js');
  else if (path === 'app') mod = await import('./app.js');
  else if (/^p\/[\w-]+$/.test(path)) { mod = await import('./pack.js'); params.id = path.slice(2); }
  else mod = { mount: notFound };
  document.body.dataset.route = path === '' ? 'home' : path.split('/')[0];
  const embed = new URLSearchParams(location.search).has('embed');
  document.body.classList.toggle('embed', embed);
  $('#footer').hidden = path === 'app' || embed;
  $('#topbar').hidden = embed;
  if (path === 'app') stopLenis(); else startLenis();
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true });
  current = (await mod.mount(view, params)) || {};
  if (location.hash) setTimeout(() => scrollToEl(document.getElementById(location.hash.slice(1))), 250);
  window.ScrollTrigger?.refresh();
}
export function navigate(path, { replace = false } = {}) {
  const url = href(path);
  if (url === location.pathname + location.search + location.hash) return;
  const [p, hash] = url.split('#');
  const samePage = p === location.pathname + location.search;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  if (samePage && hash) return scrollToEl(document.getElementById(hash));
  const go = () => render();
  if (document.startViewTransition && !reducedMotion()) document.startViewTransition(go); else go();
}
addEventListener('popstate', () => render());
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  navigate(a.getAttribute('href').replace(BASE, ''));
});

function notFound(view) {
  view.innerHTML = `<section class="sec"><div class="wrap" style="padding-top:80px;display:grid;gap:20px;justify-items:start">
    <span class="eyebrow muted">404 · file not found</span><h1 class="h1">This track isn't on the record.</h1>
    <p class="lede">The page you asked for doesn't exist. Head back home or remix a post.</p>
    <div class="cta-row"><a class="btn" href="${href('app')}" data-link>Remix a post</a><a class="btn ghost" href="${href('')}" data-link>Home</a></div></div></section>`;
}

// ---------- top bar + menu ----------
function topbar() {
  $('#topbar').innerHTML = `
    <div class="topbar-row">
      <a class="home" href="${href('')}" data-link aria-label="Remixly home">${logo({ size: 26 })}</a>
      <div style="display:flex;gap:6px;align-items:center">
        <button type="button" class="wallet-chip" id="walletChip" hidden></button>
        <button type="button" class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menu">Menu <span class="bars"></span></button>
      </div>
    </div>
    <div class="ticker" aria-hidden="true"><div class="ticker-track">${Array(8).fill('<span>One post in · Seven days out</span><span>Recorded on BOT Chain · chain 677</span>').join('')}</div></div>`;
  $('#menu').innerHTML = `
    <nav aria-label="Main">
      <a href="${href('app')}" data-link><span class="n">01</span>Remix</a>
      <a href="${href('#formats')}" data-link><span class="n">02</span>Formats</a>
      <a href="${href('#packs')}" data-link><span class="n">03</span>Packs</a>
      <a href="${href('#faq')}" data-link><span class="n">04</span>FAQ</a>
      <button type="button" id="menuConnect"><span class="n">05</span><span id="menuConnectLabel">Connect wallet</span></button>
    </nav>
    <div class="menu-foot eyebrow"><span>$ remixly pack --days 7</span><span>Chain ${NET.chainId} · ${esc(NET.name)}</span></div>`;
  $('#menuBtn').addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
  $('#menuConnect').addEventListener('click', walletAction);
  $('#walletChip').addEventListener('click', walletAction);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}
function openMenu() {
  document.body.classList.add('menu-open');
  $('#menu').setAttribute('aria-hidden', 'false');
  $('#menuBtn').setAttribute('aria-expanded', 'true');
  lenis?.stop();
  if (window.gsap && !reducedMotion()) gsap.from('#menu nav > *', { yPercent: 60, opacity: 0, duration: .5, stagger: .05, ease: 'power3.out' });
}
export function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  $('#menu').setAttribute('aria-hidden', 'true');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  lenis?.start();
}
export async function walletAction() {
  try {
    if (!hasMetaMask()) { toast('MetaMask not found. Remixing works without it; publishing needs it.', 'err'); window.open('https://metamask.io/download/', '_blank', 'noopener'); return; }
    await connect();
    if (!onRightChain()) await switchChain();
    toast(`Connected to ${NET.name}`);
  } catch (e) { toast(txMessage(e), 'err'); }
}
function walletUi(w) {
  const chip = $('#walletChip');
  const label = $('#menuConnectLabel');
  if (!chip) return;
  if (w.account && !onRightChain()) { chip.hidden = false; chip.className = 'wallet-chip warn'; chip.textContent = 'Switch to BOT Chain'; label.textContent = 'Switch to BOT Chain'; }
  else if (w.account) { chip.hidden = false; chip.className = 'wallet-chip on'; chip.textContent = short(w.account); label.textContent = short(w.account); }
  else { chip.hidden = true; label.textContent = 'Connect wallet'; }
}

// ---------- footer: credits.md ----------
function footer() {
  const addr = MAINNET_ADDRESS;
  $('#footer').innerHTML = `<div class="wrap">
    <div class="ft">
      <nav class="tree" aria-label="Pack files">
        <div class="dir"><span class="ico">▾</span>pack/</div>
        <a class="ind" href="${href('#formats')}" data-link><span class="ico">≡</span>x-thread.md</a>
        <a class="ind" href="${href('#formats')}" data-link><span class="ico">≡</span>linkedin.md</a>
        <a class="ind" href="${href('#sample')}" data-link><span class="ico">▸</span>carousel/</a>
        <a class="ind cur" aria-current="page"><span class="ico">≡</span>credits.md</a>
      </nav>
      <div class="credits" id="credits">
        <div>
          <h2><span class="hash">#</span> Recorded on BOT Chain</h2>
          <div class="kv">
            <div class="row"><span class="k">contract:</span><code title="${esc(addr || 'Set MAINNET_CONTRACT_ADDRESS in assets/config.js')}">${addr ? short(addr) : 'not deployed yet'}</code>${addr ? `<button class="copybtn" type="button" id="copyAddr">copy</button>` : ''}</div>
            <div class="row"><a class="btn tan sm" href="${esc(explorerAddress())}" target="_blank" rel="noopener">View on explorer ↗</a></div>
            <div class="row"><span class="k">packs:</span><code id="ftPacks">—</code><span class="k">·</span><span class="k">posts marked live:</span><code id="ftLive">—</code><span class="k">·</span><span class="k">chain:</span><code>677</code></div>
            ${LIVE ? '' : `<div class="row"><span class="k">// preview mode: stats come from packs saved in this browser</span></div>`}
          </div>
          <div class="ft-cols">
            <div><h4>Resources</h4><a href="${href('#how')}" data-link>How it works</a><a href="${href('#sample')}" data-link>Sample pack</a><a href="${CONFIG.links.docs}" target="_blank" rel="noopener">BOT Chain docs</a><a href="${CONFIG.links.faucet}" target="_blank" rel="noopener">Faucet</a></div>
            <div><h4>Contact</h4><a href="${CONFIG.links.telegram}" target="_blank" rel="noopener">Telegram</a><a href="${CONFIG.links.email}">Email</a></div>
            <div><h4>Legal</h4><a href="${href('#privacy')}" data-link id="lnkPrivacy">Privacy Policy</a><a href="${href('#terms')}" data-link id="lnkTerms">Terms of Service</a></div>
          </div>
        </div>
        <div class="turntable">
          <div class="platter"><div class="platter-spin"><a href="${CONFIG.links.botchain}" target="_blank" rel="noopener" aria-label="BOT Chain (opens botchain.ai)"><img src="assets/botchain-mark.png" alt="BOT Chain" width="72" height="72"></a></div></div>
          <div class="tonearm"></div>
          <div class="remi-sit">${remi({ size: 140, label: 'Remi on the turntable' })}</div>
          <span class="tt-cap">BOT Chain · 33⅓ rpm</span>
        </div>
      </div>
    </div>
    <div class="ft-bottom"><span>© 2026 Remixly · you post it, we just remix it</span><img src="assets/botchain-logo.png" alt="BOT Chain" height="16" style="height:16px;width:auto;opacity:.75"></div>
  </div>`;
  $('#copyAddr')?.addEventListener('click', () => copy(addr, 'Contract address copied'));
  $('#lnkPrivacy').addEventListener('click', (e) => { e.preventDefault(); legal('privacy'); });
  $('#lnkTerms').addEventListener('click', (e) => { e.preventDefault(); legal('terms'); });
  stats();
}
export async function stats() {
  try {
    const [t, l] = await Promise.all([registry.total(), registry.postsLive()]);
    $('#ftPacks') && ($('#ftPacks').textContent = fmt(t));
    $('#ftLive') && ($('#ftLive').textContent = fmt(l));
    return { total: t, live: l };
  } catch { return null; }
}
function legal(kind) {
  const body = kind === 'privacy'
    ? `<p><b>What stays with you.</b> Your source text stays in your browser. To create formats it is sent to the Remixly Worker and the AI model, which return the result and keep nothing. The Worker does not log source text or packs.</p>
       <p><b>What becomes public when you publish.</b> The pack you publish (title, the six formats, the schedule, tone, audience and language) is pinned to IPFS. On BOT Chain we record the title, a hash of the source, a hash of the pack, the IPFS cid, the number of formats, and any live post links you add. Blockchain records can't be deleted.</p>
       <p><b>No accounts, no tracking.</b> No sign-up, no cookies for ads, no analytics. Drafts are kept in your browser's local storage until you clear them.</p>`
    : `<p>Remixly is free. You pay only the BOT Chain gas to publish a pack or mark a post live.</p>
       <p>You are responsible for what you publish and post. AI output can be wrong: review every piece before posting. Remixly is told to use only facts from your source, but check numbers and names yourself.</p>
       <p>Remixly does not post to any social network for you. The software is provided as is, without warranty.</p>`;
  modal(`<div class="modal-card"><div class="modal-head"><span>${kind === 'privacy' ? 'privacy.md' : 'terms.md'}</span><button class="x-btn" data-close aria-label="Close">✕</button></div><div class="modal-body">${body}</div></div>`);
}

// ---------- modal / palette / reel ----------
export function modal(inner, { onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = inner;
  const prev = document.activeElement;
  const close = () => { el.remove(); removeEventListener('keydown', key); lenis?.start(); onClose?.(); prev?.focus?.(); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', key);
  document.body.append(el);
  lenis?.stop();
  (el.querySelector('[autofocus]') || el.querySelector('button, a, input'))?.focus();
  if (window.gsap && !reducedMotion()) gsap.from(el.firstElementChild, { y: 24, opacity: 0, duration: .35, ease: 'power3.out' });
  return { el, close };
}
/** ⌘K command menu. items: [{ label, hint, run }] */
export function palette(items, placeholder = 'Type a command…') {
  if ($('.palette')) return;
  const el = document.createElement('div');
  el.className = 'palette';
  el.innerHTML = `<div class="palette-card" role="dialog" aria-label="Command menu"><input type="text" placeholder="${esc(placeholder)}" aria-label="Command"><ul role="listbox"></ul></div>`;
  const input = el.querySelector('input'), ul = el.querySelector('ul');
  let sel = 0, list = items;
  const draw = () => {
    ul.innerHTML = list.map((it, i) => `<li><button type="button" role="option" aria-selected="${i === sel}" data-i="${i}"><span>${esc(it.label)}</span><span style="opacity:.5">${esc(it.hint || '')}</span></button></li>`).join('') || '<li style="padding:10px;opacity:.5;font:500 13px var(--mono)">No matches</li>';
  };
  const close = () => { el.remove(); removeEventListener('keydown', key, true); };
  const run = (i) => { const it = list[i]; close(); it?.run(); };
  const key = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(list.length - 1, sel + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  };
  input.addEventListener('input', () => { const q = input.value.toLowerCase(); list = items.filter((it) => it.label.toLowerCase().includes(q)); sel = 0; draw(); });
  ul.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) run(Number(b.dataset.i)); });
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', key, true);
  draw();
  document.body.append(el);
  input.focus();
}
export function openReel() {
  const src = CONFIG.links.reel;
  const m = modal(`<div class="modal-card ink wide"><div class="modal-head"><span>reel.mp4 · ${src ? '30s screen recording' : '30s live demo of the real app'}</span><button class="x-btn" data-close aria-label="Close">✕</button></div>
    <div class="reel-frame">${src ? `<video src="${esc(src)}" autoplay muted playsinline controls></video>` : `<iframe src="${href('app?demo=1&embed=1')}" title="Remixly demo" loading="eager"></iframe>`}</div>
    <div class="reel-bar"><i></i></div></div>`);
  if (window.gsap) gsap.to(m.el.querySelector('.reel-bar i'), { scaleX: 1, duration: 30, ease: 'none' });
}

// ---------- keyboard ----------
const keyHandlers = new Set();
export const onKey = (fn) => { keyHandlers.add(fn); return () => keyHandlers.delete(fn); };
addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k !== 'j' && k !== 'k') return;
  for (const fn of [...keyHandlers].reverse()) { if (fn(k, e) === true) { e.preventDefault(); return; } }
});

// ---------- boot ----------
topbar();
footer();
initWallet();
onWallet(walletUi);
render();
