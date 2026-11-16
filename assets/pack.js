// /p/:id — the published pack: calendar, every piece with [Copy] [Open app], [Mark posted] (owner, small tx), progress.
/* global gsap */
import { CONFIG } from './config.js';
import { $, $$, esc, pad, short, copy, toast, download, slug, reducedMotion } from './ui.js';
import { remi, remiOnce } from './remi.js';
import { FORMATS, FORMAT_IDS, DAYS, TIMEZONE, formatById, formatText, packMarkdown, cleanFormat } from './formats.js';
import { slideHTML, downloadSlidesZip } from './carousel.js';
import { registry, loadPackData, wallet, onWallet, connect, switchChain, onRightChain, LIVE, NET, explorerTx, txMessage } from './chain.js';
import { href } from './main.js';

const SHARE = {
  x: (c) => `https://x.com/intent/post?text=${encodeURIComponent(c.posts[0] || '')}`,
  linkedin: (c) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(c.text)}`,
  telegram: (c) => `https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(c.text)}`,
  carousel: () => 'https://www.instagram.com/',
  video: null,
  email: (c) => `mailto:?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(c.body)}`,
};
const OPEN_LABEL = { x: 'Open X ↗', linkedin: 'Open LinkedIn ↗', telegram: 'Open Telegram ↗', carousel: 'Open Instagram ↗', email: 'Open email ↗' };

export async function mount(view, { id: raw }) {
  view.innerHTML = `<section class="pack-page"><div class="wrap" id="pk"><div class="remixing">${remi({ size: 90, cls: 'is-spin', label: 'Loading' })}<span class="label">Reading pack #${esc(raw)} from ${LIVE ? esc(NET.name) : 'this browser'}…</span></div></div></section>`;
  const box = $('#pk');
  const id = /^\d+$/.test(raw) ? Number(raw) : -1;
  let entry, data, links = {};
  try {
    entry = await registry.getPack(id);
    if (entry) [data, links] = await Promise.all([loadPackData(entry), registry.postedLinks(id).catch(() => ({}))]);
  } catch {
    box.innerHTML = `<div class="empty"><span class="label">Network</span><h1 class="h2">Couldn't reach BOT Chain.</h1><p class="lede">Check your connection and reload.</p></div>`;
    return;
  }
  if (!view.isConnected) return;
  if (!entry) {
    box.innerHTML = `<div class="empty"><span class="label">404 · pack #${esc(raw)}</span><h1 class="h2">No pack with that number${LIVE ? ' on BOT Chain' : ' in this browser'}.</h1><a class="btn" href="${href('app')}" data-link>Remix a post</a></div>`;
    return;
  }
  const pack = data?.pack;
  const formats = {};
  if (pack) for (const fid of FORMAT_IDS) { const c = cleanFormat(fid, pack.formats?.[fid]); if (c) formats[fid] = c; }
  const ids = FORMAT_IDS.slice(0, entry.formats);
  const isOwner = () => wallet.account && wallet.account.toLowerCase() === String(entry.owner).toLowerCase() || (!LIVE && entry.owner === 'preview');

  const draw = () => {
    const posted = Object.keys(links).length;
    box.innerHTML = `
      <div class="pack-hero">
        <div>
          <span class="eyebrow muted">Pack #${pad(entry.id)} · ${LIVE ? `${esc(NET.name)} · chain ${NET.chainId}` : 'preview (this browser)'}</span>
          <h1 class="h1" style="font-size:clamp(36px,5vw,72px);margin-top:14px">${esc(entry.title)}</h1>
          <div class="pack-meta">
            <span>by ${entry.owner === 'preview' ? 'you (preview)' : `<a href="${NET.explorer}/address/${entry.owner}" target="_blank" rel="noopener">${short(entry.owner)}</a>`}</span>
            <span>${new Date(entry.at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>${entry.formats} formats</span>
            ${data ? `<span class="${data.verified ? 'verified' : ''}" style="${data.verified ? '' : 'color:var(--red)'}">${data.verified ? '✓ matches on-chain hash' : '✗ does not match the on-chain hash'}</span>` : ''}
            ${entry.cid ? `<a href="${CONFIG.ipfsGateway}${esc(entry.cid)}" target="_blank" rel="noopener">IPFS ↗</a>` : ''}
          </div>
        </div>
        <div class="posted-big"><span id="postedNum">${posted} / ${entry.formats}</span><small>posted</small>
          <div class="progress" style="margin-top:12px;min-width:180px"><div class="bar"><i id="postedBar" style="transform:scaleX(${entry.formats ? posted / entry.formats : 0})"></i></div></div></div>
      </div>
      ${!pack ? `<div class="notice err">The pack file couldn't be loaded from IPFS right now. The on-chain record is above; try again in a minute.</div>` : `
      <div class="cta-row" style="margin-bottom:18px"><button class="btn ghost sm" type="button" id="dlMd">Markdown ↓</button>${formats.carousel ? `<button class="btn ghost sm" type="button" id="dlZip">Carousel PNGs ↓</button>` : ''}<a class="btn sm" href="${href('app')}" data-link>Remix another post</a></div>
      <div class="panel read-cal"><div class="panel-h"><span class="fname">▦ calendar · 7 days</span><span class="cal-tz">Times in ${esc(pack.tz || TIMEZONE)}</span></div><div class="panel-b"><div class="cal">${DAYS.map((d, i) => `<div class="cal-col"><div class="ch"><b>${d}</b></div><div class="cal-drop">${ids.filter((fid) => pack.schedule?.[fid]?.day === i).map((fid) => { const f = formatById(fid); return `<a class="cal-chip c-${f.chip}" href="#piece-${fid}" data-jump="${fid}" style="text-decoration:none"><div class="row"><span>${f.short}</span><span>${links[FORMAT_IDS.indexOf(fid)] ? '✓' : ''}</span></div><span style="opacity:.75">${esc(pack.schedule[fid].time)}</span></a>`; }).join('')}</div></div>`).join('')}</div></div></div>
      <div class="pieces">${ids.filter((fid) => formats[fid]).map(piece).join('')}</div>`}`;
    bind();
  };
  const piece = (fid) => {
    const f = formatById(fid), c = formats[fid], idx = FORMAT_IDS.indexOf(fid), link = links[idx];
    const s = pack.schedule?.[fid];
    const body = fid === 'carousel'
      ? `<div class="slides-row">${c.slides.map((sl, i) => `<div class="slide-thumb">${slideHTML(sl, i, c.slides.length, entry.title.slice(0, 28))}</div>`).join('')}</div>`
      : `${esc(formatText(fid, c))}`;
    return `<article class="piece${link ? ' posted' : ''}" id="piece-${fid}">
      <div class="panel-h"><span class="fname"><span class="chip c-${f.chip}">${f.short}</span>${f.file}</span><span>${s ? `${DAYS[s.day]} ${esc(s.time)}` : 'unscheduled'}</span></div>
      <div class="body" data-lenis-prevent>${body}</div>
      <div class="foot">
        <button class="btn xs" type="button" data-copy="${fid}">Copy</button>
        ${SHARE[fid] ? `<a class="btn ghost xs" href="${esc(SHARE[fid](c))}" target="_blank" rel="noopener">${OPEN_LABEL[fid]}</a>` : ''}
        ${link ? `<span class="posted-link">✓ posted · <a href="${esc(link)}" target="_blank" rel="noopener nofollow">${esc(link.replace(/^https?:\/\//, '').slice(0, 48))}</a></span>` : ''}
        ${isOwner() ? `<button class="btn ghost xs" type="button" data-mark="${fid}">${link ? 'Edit link' : 'Mark posted'}</button>` : ''}
      </div>
    </article>`;
  };
  const bind = () => {
    $$('[data-copy]', box).forEach((b) => b.addEventListener('click', () => copy(formatText(b.dataset.copy, formats[b.dataset.copy]), `${formatById(b.dataset.copy).short} copied`)));
    $$('[data-jump]', box).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(`piece-${a.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
    $('#dlMd')?.addEventListener('click', () => download(`${slug(entry.title)}-pack.md`, packMarkdown({ ...pack, formats }), 'text/markdown'));
    $('#dlZip')?.addEventListener('click', async (e) => {
      const b = e.currentTarget; b.classList.add('is-busy'); b.textContent = 'Rendering…';
      try { await downloadSlidesZip(formats.carousel.slides, entry.title, entry.title.slice(0, 28)); } catch { toast('PNG export failed. Try again.', 'err'); }
      b.classList.remove('is-busy'); b.textContent = 'Carousel PNGs ↓';
    });
    $$('[data-mark]', box).forEach((b) => b.addEventListener('click', () => markForm(b.dataset.mark, b)));
    $$('.slides-row .slide-thumb', box).forEach((th) => { th.firstElementChild.style.transform = `scale(${th.clientWidth / 1080})`; });
  };
  const markForm = (fid, btn) => {
    const foot = btn.parentElement;
    const idx = FORMAT_IDS.indexOf(fid);
    const form = document.createElement('form');
    form.className = 'mark-form';
    form.innerHTML = `<input type="url" required maxlength="200" placeholder="https://… live link to the post" value="${esc(links[idx] || '')}" aria-label="Live post link"><button class="btn xs" type="submit">Save on-chain</button>`;
    foot.append(form);
    btn.remove();
    form.querySelector('input').focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = form.querySelector('input').value.trim();
      if (!/^https?:\/\/\S+$/.test(url) || url.length > 200) { toast('Paste the full live link (max 200 characters)', 'err'); return; }
      const sb = form.querySelector('button'); sb.disabled = true; sb.textContent = LIVE ? 'Confirm in MetaMask…' : 'Saving…';
      try {
        if (LIVE) { await connect(); if (!onRightChain()) await switchChain(); }
        const { tx } = await registry.markPosted(entry.id, idx, url, (h) => { sb.innerHTML = `Pending… <a href="${explorerTx(h)}" target="_blank" rel="noopener" style="color:inherit">tx ↗</a>`; });
        links[idx] = url;
        toast(tx ? 'Marked posted on BOT Chain' : 'Marked posted (preview)');
        draw();
        remiOnce(document, 'is-bounce', 1600);
        if (window.gsap && !reducedMotion()) gsap.from('#postedBar', { scaleX: Math.max(0, (Object.keys(links).length - 1) / entry.formats), duration: .8, ease: 'power3.out' });
      } catch (err) { toast(txMessage(err), 'err'); sb.disabled = false; sb.textContent = 'Retry'; }
    });
  };
  draw();
  const off = onWallet(() => { if (box.isConnected && pack) draw(); });
  if (window.gsap && !reducedMotion()) gsap.from($$('.piece', box), { y: 24, opacity: 0, duration: .6, stagger: .06, ease: 'power3.out' });
  return { cleanup: off };
}
