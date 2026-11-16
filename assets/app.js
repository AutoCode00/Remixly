// /app — Source → Voice → Remix → Edit → Calendar → Publish pack.
/* global gsap, Sortable, Flip */
import { CONFIG } from './config.js';
import { $, $$, esc, pad, store, copy, toast, download, sleep, short, reducedMotion, viewTransition, slug } from './ui.js';
import { remi, remiOnce } from './remi.js';
import {
  FORMATS, FORMAT_IDS, formatById, LIMITS, TONES, LANGS, ACTIONS, DAYS, TIMEZONE,
  len, words, videoWords, overLimits, fitLimits, formatText, packMarkdown, buildPack, suggestedSchedule, scheduleLine, guessTitle, clip,
} from './formats.js';
import { AI_LIVE, extract, remix, tweak, aiMessage } from './ai.js';
import { slideHTML, slideName, downloadSlidesZip, downloadSlide } from './carousel.js';
import { wallet, onWallet, connect, switchChain, onRightChain, hasMetaMask, NET, LIVE, registry, storePack, hashOf, txMessage, explorerTx } from './chain.js';
import { href, navigate, modal, palette, onKey } from './main.js';
import { SAMPLES } from './samples.js';

const K = `${CONFIG.storageKey}.draft`;
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const STEPS = ['Source', 'Voice', 'Remix', 'Edit', 'Calendar', 'Publish'];
const fresh = () => ({
  phase: 'setup', srcTab: 'text',
  input: { text: '', url: '', transcript: '', linkText: '', linkTitle: '' },
  source: null, summary: null, checkedFor: '',
  voice: { tone: 'friendly', sample: '', audience: '', lang: 'en' },
  title: '', formats: {}, status: {}, schedule: {}, sel: 'pack', slide: 0, published: null,
});
let S, root, cleanups = [], saveT, prevT, sortables = [];
const seen = new Set(); // overview cards already animated in

const save = () => { if (DEMO) return; clearTimeout(saveT); saveT = setTimeout(() => store.set(K, { ...S, status: Object.fromEntries(Object.entries(S.status).map(([k, v]) => [k, v === 'busy' ? (S.formats[k] ? 'ok' : 'fail') : v])) }), 300); };
const srcText = () => (S.srcTab === 'link' ? S.input.linkText : S.srcTab === 'transcript' ? S.input.transcript : S.input.text);
const allOk = () => FORMAT_IDS.every((id) => S.status[id] === 'ok' && S.formats[id]);
const anyBusy = () => FORMAT_IDS.some((id) => S.status[id] === 'busy');

// ---------- shell ----------
function shell() {
  root.innerHTML = `<section class="app"><div class="app-wrap">
    <div class="app-head">
      <div class="steps" id="steps"></div>
      <div class="head-actions">
        <span class="mode-note">${AI_LIVE ? '<b>AI</b> · Remixly Worker' : '<b>Offline remix</b> · rule-based, no AI'} · ${LIVE ? `<b>${esc(NET.name)}</b>` : '<b>Preview registry</b> (this browser)'}</span>
        <button class="btn ghost sm" id="walletBtn" type="button"></button>
      </div>
    </div>
    <div id="appBody"></div>
  </div></section>`;
  $('#walletBtn').addEventListener('click', walletClick);
  cleanups.push(onWallet(walletBtn));
}
function steps() {
  const at = S.phase === 'setup' ? 0 : !allOk() ? 2 : S.published ? 5 : Object.keys(S.schedule).length ? 4 : 3;
  $('#steps').innerHTML = STEPS.map((s, i) => `<span class="${i === at ? 'on' : i < at ? 'done' : ''}">${pad(i + 1, 2)} ${s}</span>`).join('');
}
function walletBtn(w) {
  const b = $('#walletBtn'); if (!b) return;
  b.textContent = !hasMetaMask() ? 'No MetaMask' : !w.account ? 'Connect wallet' : !onRightChain() ? 'Switch to BOT Chain' : short(w.account);
  b.classList.toggle('tan', !!w.account && !onRightChain());
}
async function walletClick() {
  if (!hasMetaMask()) { window.open('https://metamask.io/download/', '_blank', 'noopener'); return; }
  try { await connect(); if (!onRightChain()) await switchChain(); } catch (e) { toast(txMessage(e), 'err'); }
}

// ---------- step 1 + 2: source & voice ----------
function renderSetup() {
  steps();
  const t = S.srcTab;
  $('#appBody').innerHTML = `
  <div class="setup">
    <div class="panel">
      <div class="panel-h"><span class="fname">≡ source.md</span><span>Step 01 · Source</span></div>
      <div class="panel-b">
        <div class="tabs" role="tablist">${[['text', 'Paste text'], ['link', 'Link'], ['transcript', 'Transcript']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${t === k}">${l}</button>`).join('')}</div>
        <div style="margin-top:12px" id="srcPane">${srcPane()}</div>
        <div class="src-meta"><span id="wc"></span><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" type="button" id="sampleBtn">Try a sample</button><button class="btn line sm" type="button" id="checkBtn">Check source</button></span></div>
        <div id="srcNote"></div>
        <div id="summary"></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-h"><span class="fname">≡ voice.md</span><span>Step 02 · Voice</span></div>
      <div class="panel-b">
        <div class="form-row"><span class="label">Tone</span><div class="chips-pick" id="tones">${TONES.map((x) => `<button type="button" data-tone="${x.id}" aria-pressed="${S.voice.tone === x.id}">${x.label}</button>`).join('')}</div></div>
        <div class="form-row"><label for="aud">Audience</label><input class="field" id="aud" maxlength="120" placeholder="e.g. BOT Chain builders" value="${esc(S.voice.audience)}"></div>
        <div class="form-row"><span class="label">Language</span><div class="chips-pick" id="langs">${LANGS.map((x) => `<button type="button" data-lang="${x.id}" aria-pressed="${S.voice.lang === x.id}">${x.label}</button>`).join('')}</div></div>
        <div class="form-row" style="margin:0"><label for="sampleVoice">Sounds like this <span style="text-transform:none;letter-spacing:0">(optional)</span></label><textarea class="field" id="sampleVoice" maxlength="1500" placeholder="Paste a post you wrote. Remixly copies the style, never the facts.">${esc(S.voice.sample)}</textarea></div>
      </div>
    </div>
  </div>
  <div class="remix-bar">
    <div style="display:flex;align-items:center;gap:14px">${remi({ size: 54, cls: 'is-slow', label: 'Remi' })}<div class="term"><b>$</b> remixly pack <span id="cmdEcho"></span> --days 7</div></div>
    <button class="btn paper" type="button" id="remixBtn">Remix it ▸</button>
  </div>`;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { S.srcTab = b.dataset.tab; save(); renderSetup(); }));
  bindSrc();
  $('#sampleBtn').addEventListener('click', () => { const s = SAMPLES.blog.source; S.srcTab = 'text'; S.input.text = s.text; S.summary = null; save(); renderSetup(); });
  $('#checkBtn').addEventListener('click', () => checkSource());
  $$('[data-tone]').forEach((b) => b.addEventListener('click', () => { S.voice.tone = b.dataset.tone; $$('[data-tone]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); echo(); save(); }));
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => { S.voice.lang = b.dataset.lang; $$('[data-lang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); echo(); save(); }));
  $('#aud').addEventListener('input', (e) => { S.voice.audience = e.target.value; save(); });
  $('#sampleVoice').addEventListener('input', (e) => { S.voice.sample = e.target.value; save(); });
  $('#remixBtn').addEventListener('click', startRemix);
  meta(); echo(); drawSummary();
}
function srcPane() {
  if (S.srcTab === 'link') return `<form id="linkForm" class="input-row"><input class="field" id="url" type="url" inputmode="url" placeholder="https://yourblog.com/your-post" value="${esc(S.input.url)}" aria-label="Article or blog URL"><button class="btn sm" type="submit" style="min-height:46px">Read link</button></form>
    ${S.input.linkText ? `<textarea class="field src-text" id="src" style="margin-top:10px" aria-label="Extracted text">${esc(S.input.linkText)}</textarea>` : `<p class="muted" style="font-size:14px">Remixly reads the article and keeps only the main text. Paywalled or JavaScript-only pages can't be read: paste the text instead.</p>`}`;
  const tr = S.srcTab === 'transcript';
  return `<textarea class="field src-text" id="src" aria-label="${tr ? 'Transcript' : 'Source text'}" placeholder="${tr ? 'Paste a video or podcast transcript. Timestamps and speaker names are fine.' : 'Paste your blog post, announcement or notes. At least 80 words.'}">${esc(tr ? S.input.transcript : S.input.text)}</textarea>`;
}
function bindSrc() {
  const ta = $('#src');
  ta?.addEventListener('input', () => {
    if (S.srcTab === 'text') S.input.text = ta.value; else if (S.srcTab === 'transcript') S.input.transcript = ta.value; else S.input.linkText = ta.value;
    meta(); save();
  });
  $('#linkForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('#url').value.trim();
    S.input.url = url;
    if (!/^https?:\/\/\S+\.\S+/.test(url)) { note('Enter a full link, starting with https://', 'err'); return; }
    if (!AI_LIVE) { note("Reading links needs the Remixly Worker, which isn't configured here. Paste the text instead.", 'err'); return; }
    const btn = e.submitter; btn.classList.add('is-busy'); btn.textContent = 'Reading…';
    try {
      const out = await extract({ url }, S.voice);
      S.input.linkText = out.text; S.input.linkTitle = out.title;
      S.summary = out.summary?.length ? out.summary : null; S.checkedFor = out.text;
      save(); renderSetup();
      if (out.long) note(`That's ${words(out.text).toLocaleString()} words. Remixly will summarise it first.`);
    } catch (err) {
      note(err.code === 'unreadable' || err.code === 'offline_link' ? "Couldn't read that link (paywall or JavaScript-only page). Paste the text instead." : aiMessage(err), 'err', err.code === 'unreadable' ? `<button class="btn xs" type="button" id="pasteInstead" style="margin-left:8px">Paste the text instead</button>` : '');
      $('#pasteInstead')?.addEventListener('click', () => { S.srcTab = 'text'; renderSetup(); $('#src')?.focus(); });
    } finally { btn.classList.remove('is-busy'); btn.textContent = 'Read link'; }
  });
}
function meta() {
  const n = words(srcText());
  const el = $('#wc'); if (!el) return;
  el.innerHTML = `${n.toLocaleString()} words${n && n < LIMITS.minWords ? ` · <span style="color:var(--red)">need ${LIMITS.minWords}+</span>` : n > LIMITS.hardMaxWords ? ` · <span style="color:var(--red)">max ${LIMITS.hardMaxWords.toLocaleString()}</span>` : n > LIMITS.maxWords ? ' · long: summarised first' : n ? ' · ✓ good length' : ''}`;
  if (S.summary && S.checkedFor !== srcText()) { S.summary = null; drawSummary(); }
}
function echo() { const e = $('#cmdEcho'); if (e) e.textContent = `--tone ${S.voice.tone} --lang ${S.voice.lang}`; }
function note(msg, kind = '', extra = '') { const el = $('#srcNote'); if (el) el.innerHTML = msg ? `<div class="notice ${kind}" style="margin-top:12px">${esc(msg)}${extra}</div>` : ''; }
function drawSummary() {
  const el = $('#summary'); if (!el) return;
  el.innerHTML = S.summary ? `<div class="summary"><span class="label">Remi's 2-line summary · is this the right text?</span>${S.summary.map((l) => `<div>→ ${esc(l)}</div>`).join('')}</div>` : '';
}
async function checkSource() {
  const text = srcText();
  const n = words(text);
  if (n < LIMITS.minWords) { note(`The source is too short (${n} words). Paste at least ${LIMITS.minWords} words.`, 'err'); return false; }
  if (n > LIMITS.hardMaxWords) { note(`That's over ${LIMITS.hardMaxWords.toLocaleString()} words. Paste one article or episode at a time.`, 'err'); return false; }
  note(n > LIMITS.maxWords ? `Long source (${n.toLocaleString()} words): Remixly will summarise it first, keeping the facts.` : '');
  const btn = $('#checkBtn'); btn?.classList.add('is-busy');
  try {
    const out = await extract({ text, title: S.srcTab === 'link' ? S.input.linkTitle : '' }, S.voice);
    S.summary = out.summary?.length ? out.summary : null; S.checkedFor = text; save(); drawSummary();
  } finally { btn?.classList.remove('is-busy'); }
  return true;
}

// ---------- step 3: remix ----------
async function startRemix() {
  const text = srcText().trim();
  const n = words(text);
  if (n < LIMITS.minWords) { note(`The source is too short (${n} words). Paste at least ${LIMITS.minWords} words.`, 'err'); $('#src')?.focus(); return; }
  if (n > LIMITS.hardMaxWords) { note(`That's over ${LIMITS.hardMaxWords.toLocaleString()} words. Paste one article or episode at a time.`, 'err'); return; }
  const title = S.srcTab === 'link' && S.input.linkTitle ? S.input.linkTitle : guessTitle(text);
  S.source = { kind: S.srcTab, title, text, url: S.srcTab === 'link' ? S.input.url : '', words: n };
  S.title = clip(title, LIMITS.title);
  S.formats = {}; S.status = Object.fromEntries(FORMAT_IDS.map((id) => [id, 'busy'])); S.schedule = {}; S.sel = 'pack'; S.published = null;
  S.phase = 'work';
  save();
  viewTransition(renderWork);
  await runRemix(FORMAT_IDS);
}
async function runRemix(ids, demoFormats) {
  ids.forEach((id) => (S.status[id] = 'busy'));
  drawTree(); drawEditor(); steps();
  try {
    const onFormat = (id, c) => { S.formats[id] = c; S.status[id] = 'ok'; drawTree(); if (S.sel === 'pack' || S.sel === id) drawEditor(); drawPreview(); drawCal(); };
    if (demoFormats) { for (const id of ids) { await sleep(420); onFormat(id, structuredClone(demoFormats[id])); } }
    else {
      const { failed, condensed } = await remix(S.source, S.voice, ids, onFormat);
      if (condensed) S.source.text = condensed; // very long sources: later tweaks use the condensed version
      failed.forEach((id) => (S.status[id] = 'fail'));
      if (failed.length) toast(`${failed.length} format${failed.length > 1 ? 's' : ''} didn't come through. Retry ${failed.length > 1 ? 'them' : 'it'} below.`, 'err');
    }
  } catch (e) {
    ids.forEach((id) => { if (S.status[id] === 'busy') S.status[id] = 'fail'; });
    toast(aiMessage(e), 'err');
  }
  save(); drawTree(); drawEditor(); drawPreview(); drawCal(); steps();
  if (allOk() && S.sel === 'pack' && !DEMO) setTimeout(() => select('x'), 500);
}

// ---------- step 4–6: workspace ----------
function renderWork() {
  steps();
  $('#appBody').innerHTML = `
  <div class="ws-head">
    <div><span class="label">Pack title · ${LIMITS.title} max</span><input class="title-input" id="packTitle" maxlength="${LIMITS.title}" value="${esc(S.title)}" aria-label="Pack title"></div>
    <div class="actions">
      <button class="btn ghost sm" type="button" id="backBtn">← Source</button>
      <button class="btn ghost sm" type="button" id="dlMd">Markdown ↓</button>
      <button class="btn ghost sm" type="button" id="dlZip">Carousel PNGs ↓</button>
      <button class="btn sm" type="button" id="pubBtn">Publish pack</button>
    </div>
  </div>
  <div class="mobile-tabs" role="tablist">${['files', 'editor', 'preview'].map((t) => `<button type="button" data-mtab="${t}" aria-selected="${t === 'editor'}">${t}</button>`).join('')}</div>
  <div class="ws" data-tab="editor" id="ws">
    <aside class="ws-tree" aria-label="Pack files"><div class="t-title"><span>~/pack</span><span id="okCount"></span></div><nav class="tree" id="tree"></nav>
      <div class="hint"><span class="kbd">⌘J</span> next file<br><span class="kbd">⌘K</span> commands</div></aside>
    <div class="ws-edit"><div class="panel"><div class="panel-h" id="edHead"></div><div class="panel-b" id="editor"></div></div></div>
    <aside class="ws-prev"><div class="phone"><div class="phone-screen" id="phone" data-lenis-prevent></div></div></aside>
  </div>
  <div class="ws-cal panel" style="margin-top:10px"><div class="panel-h"><span class="fname">▦ calendar · 7 days</span><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="cal-tz">Times in ${TIMEZONE} (GMT+7)</span><button class="btn line xs" type="button" id="suggestBtn" title="${esc(scheduleLine())}">Suggested schedule</button><button class="btn ghost xs" type="button" id="clearCal">Clear</button></span></div><div class="panel-b"><div class="cal" id="cal"></div></div></div>`;
  $('#packTitle').addEventListener('input', (e) => { S.title = e.target.value; save(); });
  $('#backBtn').addEventListener('click', () => { if (anyBusy()) return; S.phase = 'setup'; save(); viewTransition(renderSetup); });
  $('#dlMd').addEventListener('click', downloadMd);
  $('#dlZip').addEventListener('click', downloadZip);
  $('#pubBtn').addEventListener('click', openPublish);
  $('#suggestBtn').addEventListener('click', () => applySchedule(suggestedSchedule()));
  $('#clearCal').addEventListener('click', () => applySchedule({}));
  $$('[data-mtab]').forEach((b) => b.addEventListener('click', () => setMTab(b.dataset.mtab)));
  drawTree(); drawEditor(); drawPreview(); drawCal();
}
function setMTab(t) { $('#ws').dataset.tab = t; $$('[data-mtab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mtab === t))); }

// files
function fileList() {
  const out = [{ key: 'pack', name: 'pack/', icon: '▾' }, { key: 'source', name: 'source.md', icon: '≡', ind: 1 }];
  for (const f of FORMATS) {
    if (f.id === 'carousel') {
      out.push({ key: 'carousel', name: 'carousel/', icon: '▸', ind: 1, id: 'carousel' });
      (S.formats.carousel?.slides || []).forEach((_, i) => out.push({ key: `slide:${i}`, name: slideName(i), icon: '▣', ind: 2, id: 'carousel', slide: i }));
    } else out.push({ key: f.id, name: f.file, icon: '≡', ind: 1, id: f.id });
  }
  return out;
}
const selKey = () => (S.sel === 'carousel' && S.slideSel != null ? `slide:${S.slideSel}` : S.sel);
function drawTree() {
  const tree = $('#tree'); if (!tree) return;
  const ok = FORMAT_IDS.filter((id) => S.status[id] === 'ok').length;
  $('#okCount').textContent = `${ok}/6`;
  tree.innerHTML = fileList().map((f) => {
    const st = f.id && !f.slide && f.slide !== 0 ? S.status[f.id] : '';
    const badge = st === 'busy' ? '<span class="st spin" aria-label="remixing"></span>' : st === 'fail' ? '<span class="st err">!</span>' : st === 'ok' ? '<span class="st ok">✓</span>' : '';
    return `<button type="button" data-key="${f.key}" aria-current="${selKey() === f.key}" style="padding-left:${8 + (f.ind || 0) * 16}px"><span class="ico">${f.icon}</span>${f.name}${badge}</button>`;
  }).join('');
  $$('button', tree).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.key;
    if (k.startsWith('slide:')) { S.slide = Number(k.slice(6)); select('carousel', S.slide); } else select(k);
    if (matchMedia('(max-width: 900px)').matches) setMTab(k === 'pack' ? 'editor' : 'editor');
  }));
}
function select(key, slide = null) {
  S.sel = key; S.slideSel = slide; if (slide != null) S.slide = slide;
  viewTransition(() => { drawTree(); drawEditor(); drawPreview(); });
  save();
}
function nextFile() {
  const keys = ['pack', 'source', ...FORMAT_IDS];
  select(keys[(keys.indexOf(S.sel) + 1) % keys.length]);
}

// editor
const ctr = (n, max, unit = '') => `<span class="count${n > max ? ' over' : ''}">${n.toLocaleString()} / ${max.toLocaleString()}${unit}</span>`;
function drawEditor() {
  const ed = $('#editor'), head = $('#edHead'); if (!ed) return;
  const id = S.sel;
  if (id === 'pack') {
    head.innerHTML = `<span class="fname">▾ pack/</span><span>${FORMAT_IDS.filter((x) => S.status[x] === 'ok').length} / 6 formats</span>`;
    const busy = anyBusy();
    ed.innerHTML = `${busy ? `<div class="remixing">${remi({ size: 110, cls: 'is-spin', label: 'Remi is remixing' })}<div class="term"><b>$</b> remixly pack --days 7<br>Remi is remixing… ${FORMAT_IDS.filter((x) => S.status[x] === 'ok').length}/6</div></div>` : ''}
      <div class="overview">${FORMATS.map((f) => {
        const st = S.status[f.id], c = S.formats[f.id];
        return `<button type="button" class="ov-card ${st === 'busy' ? 'wait' : st === 'fail' ? 'fail' : ''}" data-open="${f.id}"><div class="fh"><span>${f.file}</span><span class="chip c-${f.chip}">${f.short}</span></div><div class="fbody">${st === 'busy' ? '<span class="label">writing…</span>' : st === 'fail' ? 'Remi dropped this one. Open it to retry.' : esc(formatText(f.id, c).slice(0, 400))}</div></button>`;
      }).join('')}</div>`;
    $$('[data-open]', ed).forEach((b) => b.addEventListener('click', () => select(b.dataset.open)));
    const fresh = $$('.ov-card:not(.wait)', ed).filter((el) => !seen.has(el.dataset.open + S.status[el.dataset.open]));
    fresh.forEach((el) => seen.add(el.dataset.open + S.status[el.dataset.open]));
    if (fresh.length && window.gsap && !reducedMotion()) gsap.from(fresh, { y: 14, opacity: 0, duration: .45, stagger: .05, ease: 'power3.out' });
    return;
  }
  if (id === 'source') {
    head.innerHTML = `<span class="fname">≡ source.md</span><span>${S.source.words.toLocaleString()} words · read only</span>`;
    ed.innerHTML = `<div class="notice" style="margin-bottom:12px">Every format only uses facts from this source. To change it, go back to <button class="btn xs" type="button" id="toSrc">← Source</button></div><div style="white-space:pre-wrap;font-size:14.5px;line-height:1.65;max-height:600px;overflow:auto" data-lenis-prevent>${esc(S.source.text)}</div>`;
    $('#toSrc').addEventListener('click', () => $('#backBtn').click());
    return;
  }
  const f = formatById(id), c = S.formats[id], st = S.status[id];
  drawHead(id);
  if (st === 'busy') { ed.innerHTML = `<div class="remixing">${remi({ size: 96, cls: 'is-spin', label: 'Remi is remixing' })}<div class="term">Remi is writing ${esc(f.file)}…</div></div>`; return; }
  if (st === 'fail' || !c) {
    ed.innerHTML = `<div class="remixing">${remi({ size: 90, label: 'Remi' })}<p class="muted">Remi dropped the needle on <b>${esc(f.file)}</b>. The other formats are kept.</p><button class="btn" type="button" id="retry">↻ Retry this format</button></div>`;
    $('#retry').addEventListener('click', () => runRemix([id]));
    return;
  }
  ed.innerHTML = `<div class="ed">${editorBody(id, c)}</div>`;
  bindEditor(id);
}
function editorBody(id, c) {
  if (id === 'x') return `${c.posts.map((p, i) => `<div class="post-item"><span class="n">${i + 1}/${c.posts.length}</span><div><textarea rows="2" data-k="posts" data-i="${i}" aria-label="Post ${i + 1}">${esc(p)}</textarea><div class="ctr">${ctr(len(p), LIMITS.xPost)}${c.posts.length > LIMITS.xMin ? `<button class="rm" type="button" data-rm="${i}">Remove</button>` : ''}</div></div></div>`).join('')}
    ${c.posts.length < LIMITS.xMax ? `<button class="btn ghost sm" type="button" id="addItem" style="margin-top:10px">+ Add post</button>` : ''}`;
  if (id === 'linkedin' || id === 'telegram') { const max = id === 'linkedin' ? LIMITS.linkedin : LIMITS.telegram; return `<div class="big"><textarea data-k="text" aria-label="${id} text">${esc(c.text)}</textarea><div class="ctr">${ctr(len(c.text), max)}<span>${words(c.text)} words</span></div></div>`; }
  if (id === 'carousel') return `${c.slides.map((s, i) => `<div class="slide-item"><button type="button" class="slide-thumb" data-slide="${i}" aria-label="Preview ${slideName(i)}" style="padding:0;cursor:pointer">${slideHTML(s, i, c.slides.length)}</button><div style="display:grid;gap:6px">
      <span class="label">${slideName(i)}</span>
      <div><input data-k="title" data-i="${i}" value="${esc(s.title)}" aria-label="Slide ${i + 1} title" style="font-weight:600"><div class="ctr">${ctr(len(s.title), LIMITS.slideTitle)}<span></span></div></div>
      <div><textarea rows="2" data-k="line" data-i="${i}" aria-label="Slide ${i + 1} line">${esc(s.line)}</textarea><div class="ctr">${ctr(len(s.line), LIMITS.slideLine)}<span style="display:flex;gap:8px"><button class="rm" type="button" data-png="${i}">PNG ↓</button>${c.slides.length > LIMITS.slidesMin ? `<button class="rm" type="button" data-rm="${i}">Remove</button>` : ''}</span></div></div>
    </div></div>`).join('')}
    ${c.slides.length < LIMITS.slidesMax ? `<button class="btn ghost sm" type="button" id="addItem" style="margin-top:10px">+ Add slide</button>` : ''}`;
  if (id === 'video') return `<div class="vid-row"><span class="at">0–3s<br><br>HOOK</span><div><textarea rows="2" data-k="hook">${esc(c.hook)}</textarea></div></div>
    ${c.beats.map((b, i) => `<div class="vid-row"><span class="at">${esc(b.at)}<br><br>BEAT ${i + 1}</span><div><textarea rows="2" data-k="beat" data-i="${i}">${esc(b.line)}</textarea></div></div>`).join('')}
    <div class="vid-row"><span class="at">25–30s<br><br>CTA</span><div><textarea rows="1" data-k="cta">${esc(c.cta)}</textarea></div></div>
    <div class="ctr" id="vidCtr">${ctr(videoWords(c), LIMITS.videoWords, ' words')}<span>≈ ${Math.round(videoWords(c) / 2.6)}s spoken</span></div>`;
  if (id === 'email') return `<div style="display:grid;gap:12px"><div><span class="label">Subject</span><input data-k="subject" value="${esc(c.subject)}" style="font-weight:600;margin-top:6px"><div class="ctr">${ctr(len(c.subject), LIMITS.emailSubject)}<span></span></div></div>
    <div class="big"><span class="label">Body</span><textarea data-k="body" style="min-height:260px;margin-top:6px">${esc(c.body)}</textarea><div class="ctr">${ctr(words(c.body), LIMITS.emailWords, ' words')}<span></span></div></div></div>`;
  return '';
}
const autosize = (t) => { if (t.tagName !== 'TEXTAREA' || t.closest('.big')) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
function bindEditor(id) {
  const ed = $('#editor');
  $$('textarea', ed).forEach(autosize);
  ed.addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset.k) return;
    const c = S.formats[id], i = Number(t.dataset.i), k = t.dataset.k, v = t.value;
    if (k === 'posts') c.posts[i] = v;
    else if (k === 'title' || k === 'line') c.slides[i][k] = v;
    else if (k === 'beat') c.beats[i].line = v;
    else c[k] = v;
    autosize(t);
    // live counters
    const box = t.parentElement.querySelector('.count');
    const max = { posts: LIMITS.xPost, title: LIMITS.slideTitle, line: LIMITS.slideLine, text: id === 'linkedin' ? LIMITS.linkedin : LIMITS.telegram, subject: LIMITS.emailSubject }[k];
    if (box && max) { const n = len(v); box.textContent = `${n.toLocaleString()} / ${max.toLocaleString()}`; box.classList.toggle('over', n > max); }
    if (k === 'body') { const n = words(v); box.textContent = `${n} / ${LIMITS.emailWords} words`; box.classList.toggle('over', n > LIMITS.emailWords); }
    if (id === 'video') $('#vidCtr').innerHTML = `${ctr(videoWords(c), LIMITS.videoWords, ' words')}<span>≈ ${Math.round(videoWords(c) / 2.6)}s spoken</span>`;
    if (k === 'title' || k === 'line') { const th = ed.querySelector(`[data-slide="${i}"]`); th.innerHTML = slideHTML(c.slides[i], i, c.slides.length); }
    const hasShorten = !!$('#shorten'), over = overLimits(id, c).length > 0;
    if (hasShorten !== over) drawHeadOnly(id);
    save(); clearTimeout(prevT); prevT = setTimeout(drawPreview, 120);
  });
  ed.addEventListener('click', (e) => {
    const c = S.formats[id];
    const rm = e.target.closest('[data-rm]'), png = e.target.closest('[data-png]'), sl = e.target.closest('[data-slide]');
    if (rm) { const i = Number(rm.dataset.rm); if (id === 'x') c.posts.splice(i, 1); else c.slides.splice(i, 1); save(); drawEditor(); drawTree(); drawPreview(); }
    else if (png) downloadSlide(c.slides, Number(png.dataset.png), clip(S.title, 28)).catch(() => toast('PNG export failed. Try again.', 'err'));
    else if (sl) { S.slide = Number(sl.dataset.slide); drawPreview(); if (matchMedia('(max-width: 900px)').matches) setMTab('preview'); }
    else if (e.target.closest('#addItem')) { if (id === 'x') c.posts.splice(c.posts.length - 1, 0, ''); else c.slides.splice(c.slides.length - 1, 0, { title: 'New slide', line: '' }); save(); drawEditor(); drawTree(); }
  });
}
function drawHead(id) {
  const head = $('#edHead'), f = formatById(id), st = S.status[id];
  const over = overLimits(id, S.formats[id]);
  head.innerHTML = `<span class="fname"><span class="chip c-${f.chip}">${f.short}</span>${f.file}</span>
    <span class="actions">${ACTIONS.map((a) => `<button class="btn ghost xs" type="button" data-act="${a.id}" ${st !== 'ok' ? 'disabled' : ''}>${a.label}</button>`).join('')}
    ${over.length ? `<button class="btn xs" type="button" id="shorten" style="--bg:var(--red);--fg:#fff">Shorten</button>` : ''}
    <button class="btn xs" type="button" id="copyF" ${st !== 'ok' ? 'disabled' : ''}>Copy</button></span>`;
  $$('[data-act]', head).forEach((b) => b.addEventListener('click', () => doTweak(id, b.dataset.act)));
  $('#copyF')?.addEventListener('click', () => copy(formatText(id, S.formats[id]), `${f.short} copied`));
  $('#shorten')?.addEventListener('click', () => { S.formats[id] = fitLimits(id, S.formats[id]); save(); drawEditor(); drawPreview(); toast('Trimmed to the platform limits'); });
}
const drawHeadOnly = drawHead;
async function doTweak(id, action) {
  if (S.status[id] !== 'ok') return;
  const before = S.formats[id];
  S.status[id] = 'busy';
  if (action === 'regenerate') remiOnce(document, 'is-scratch', 850);
  drawTree(); drawEditor();
  try {
    S.formats[id] = await tweak(id, before, action, S.source, S.voice);
    S.status[id] = 'ok';
    toast(`${formatById(id).short}: ${ACTIONS.find((a) => a.id === action).label.replace('↻ ', '').toLowerCase()} done`);
  } catch (e) { S.formats[id] = before; S.status[id] = 'ok'; toast(aiMessage(e), 'err'); }
  save(); drawTree(); if (S.sel === id) drawEditor(); drawPreview();
  if (action === 'regenerate') remiOnce(document, 'is-scratch', 850);
}

// preview
const avatar = () => `<span class="av">${remi({ size: 30, label: '' })}</span>`;
function drawPreview() {
  const ph = $('#phone'); if (!ph) return;
  const id = FORMAT_IDS.includes(S.sel) ? S.sel : 'x';
  const f = formatById(id), c = S.formats[id];
  const bar = `<div class="phone-bar"><span>9:41</span><span class="mono" style="font-size:11px">${f.platform}</span><span>●●●</span></div>`;
  if (!c) { ph.innerHTML = `${bar}<div class="pv muted">Preview appears when ${esc(f.file)} is ready.</div>`; return; }
  const name = `<div class="pv-name">You<small>@you · now</small></div>`;
  let body = '';
  if (id === 'x') body = c.posts.map((p, i) => `<div class="tw"><div>${avatar()}${i < c.posts.length - 1 ? '<div class="line"></div>' : ''}</div><div><div class="pv-head" style="margin:0 0 2px"><span class="pv-name">You <small style="display:inline">@you · ${i + 1}/${c.posts.length}</small></span></div><div class="pv-text">${esc(p)}</div></div></div>`).join('');
  if (id === 'linkedin') body = `<div class="pv-head">${avatar()}<div class="pv-name">You<small>Founder · now · 🌐</small></div></div><div class="pv-text">${esc(c.text)}</div><div class="mono" style="font-size:11px;color:#8a8883;margin-top:14px;border-top:1px solid #f0eee9;padding-top:10px">👍 Like · 💬 Comment · ↻ Repost</div>`;
  if (id === 'telegram') return void (ph.innerHTML = `${bar}<div class="tg-bg"><div class="tg-bubble"><div class="ch">Your channel</div><div class="pv-text">${esc(c.text)}</div><div style="text-align:right;font-size:11px;color:#8a8883;margin-top:4px">${S.schedule.telegram?.time || '10:00'} ✓✓</div></div></div>`);
  if (id === 'carousel') {
    const i = Math.min(S.slide, c.slides.length - 1);
    ph.innerHTML = `${bar}<div class="pv-head" style="padding:10px 12px 8px;margin:0">${avatar()}${name}</div><div class="ig-slide" id="igSlide">${slideHTML(c.slides[i], i, c.slides.length, clip(S.title, 28))}</div>
      <div class="ig-dots">${c.slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="ig-nav"><button class="btn ghost xs" type="button" data-sl="-1">‹ Prev</button><span class="mono" style="font-size:11px">${slideName(i)}</span><button class="btn ghost xs" type="button" data-sl="1">Next ›</button></div>
      <div class="pv"><b>you</b> ${esc(c.slides[0].title)} → swipe</div>`;
    const box = $('#igSlide'); box.firstElementChild.style.transform = `scale(${box.clientWidth / 1080})`;
    $$('[data-sl]', ph).forEach((b) => b.addEventListener('click', () => { S.slide = (i + Number(b.dataset.sl) + c.slides.length) % c.slides.length; drawPreview(); }));
    return;
  }
  if (id === 'video') return void (ph.innerHTML = `${bar}<div class="teleprompter"><div><span class="at">0–3s · HOOK</span><p>${esc(c.hook)}</p></div>${c.beats.map((b) => `<div><span class="at">${esc(b.at)}</span><p>${esc(b.line)}</p></div>`).join('')}<div><span class="at">25–30s · CTA</span><p>${esc(c.cta)}</p></div></div>`);
  if (id === 'email') body = `<div class="mail"><div class="pv-head">${avatar()}<div class="pv-name">You<small>to: subscribers</small></div></div><div class="subj">${esc(c.subject)}</div><div class="pv-text">${esc(c.body)}</div></div>`;
  ph.innerHTML = `${bar}<div class="pv">${body}</div>`;
}

// calendar
const chip = (id) => { const f = formatById(id); const s = S.schedule[id]; return `<div class="cal-chip c-${f.chip}" data-id="${id}" data-flip-id="chip-${id}"><div class="row"><button class="open" type="button" data-openf="${id}">${f.short}</button><span>⋮⋮</span></div>${s ? `<input type="time" value="${s.time}" data-time="${id}" aria-label="${f.short} time">` : ''}</div>`; };
function drawCal() {
  const cal = $('#cal'); if (!cal) return;
  sortables.forEach((s) => s.destroy()); sortables = [];
  const ready = FORMAT_IDS.filter((id) => S.formats[id]);
  const tray = ready.filter((id) => !S.schedule[id]);
  cal.innerHTML = `<div class="cal-col tray"><div class="ch"><span>Unscheduled</span><b>${tray.length}</b></div><div class="cal-drop" data-day="">${tray.map(chip).join('')}</div></div>`
    + DAYS.map((d, i) => `<div class="cal-col"><div class="ch"><b>${d}</b><span>${dayDate(i)}</span></div><div class="cal-drop" data-day="${i}">${ready.filter((id) => S.schedule[id]?.day === i).sort((a, b) => S.schedule[a].time.localeCompare(S.schedule[b].time)).map(chip).join('')}</div></div>`).join('');
  if (window.Sortable) $$('.cal-drop', cal).forEach((el) => sortables.push(Sortable.create(el, { group: 'cal', animation: 180, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', filter: 'input,button.open', preventOnFilter: false, onEnd: readCal })));
  $$('[data-time]', cal).forEach((t) => t.addEventListener('change', () => { S.schedule[t.dataset.time].time = t.value || '09:00'; save(); }));
  $$('[data-openf]', cal).forEach((b) => b.addEventListener('click', () => select(b.dataset.openf)));
  steps();
}
function dayDate(i) { // the coming Mon–Sun
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
  const mon = new Date(now); mon.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  const d = new Date(mon); d.setDate(mon.getDate() + i);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function readCal() {
  const next = {};
  $$('.cal-drop').forEach((drop) => {
    if (drop.dataset.day === '') return;
    $$('.cal-chip', drop).forEach((ch) => { const id = ch.dataset.id; next[id] = { day: Number(drop.dataset.day), time: S.schedule[id]?.time || suggestedSchedule()[id].time }; });
  });
  S.schedule = next; save(); drawCal();
}
function applySchedule(sched) {
  const cal = $('#cal');
  const state = window.Flip && !reducedMotion() ? Flip.getState($$('.cal-chip', cal)) : null;
  S.schedule = Object.fromEntries(Object.entries(sched).filter(([id]) => S.formats[id]));
  save(); drawCal();
  if (state) Flip.from(state, { targets: $$('.cal-chip', cal), duration: .6, ease: 'power3.inOut', stagger: .04, absolute: true });
}

// downloads
const currentPack = () => buildPack({ title: S.title.trim() || S.source.title, source: S.source, voice: S.voice, formats: S.formats, schedule: S.schedule });
function downloadMd() { if (!Object.keys(S.formats).length) return; download(`${slug(S.title)}-pack.md`, packMarkdown(currentPack()), 'text/markdown'); toast('Markdown downloaded'); }
async function downloadZip() {
  const c = S.formats.carousel; if (!c) return toast('The carousel is not ready yet', 'err');
  const b = $('#dlZip'); b.classList.add('is-busy'); b.textContent = 'Rendering…';
  try { await downloadSlidesZip(c.slides, S.title, clip(S.title, 28)); toast(`${c.slides.length} slides downloaded`); }
  catch { toast('PNG export failed. Try again.', 'err'); }
  finally { b.classList.remove('is-busy'); b.textContent = 'Carousel PNGs ↓'; }
}

// ---------- publish ----------
function openPublish() {
  if (!allOk()) { toast(anyBusy() ? 'Remi is still remixing…' : 'Retry the missing formats first: a pack has all 6.', 'err'); return; }
  const title = S.title.trim();
  if (!title) { toast('Give the pack a title first', 'err'); $('#packTitle').focus(); return; }
  const over = FORMAT_IDS.filter((id) => overLimits(id, S.formats[id]).length);
  const unscheduled = FORMAT_IDS.filter((id) => !S.schedule[id]);
  let cached = null; // { packHash, cid, json } survives an IPFS retry
  const m = modal(`<div class="modal-card"><div class="modal-head"><span>publish · pack.json</span><button class="x-btn" data-close aria-label="Close">✕</button></div>
    <div class="modal-body">
      <div style="display:flex;gap:14px;align-items:center">${remi({ size: 64, cls: 'is-slow', label: 'Remi' })}<div><div class="h3">${esc(title)}</div><div class="label" style="margin-top:4px">6 formats · ${((n) => `${n} free day${n === 1 ? '' : 's'}`)(7 - new Set(Object.values(S.schedule).map((s) => s.day)).size)} · ${TIMEZONE}</div></div></div>
      ${over.length ? `<div class="notice err">Over the limit: ${over.map((id) => formatById(id).file).join(', ')}. You can still publish, but those posts may be cut by the platform.</div>` : ''}
      ${unscheduled.length ? `<div class="notice">Not on the calendar yet: ${unscheduled.map((id) => formatById(id).short).join(', ')}. <button class="btn xs" type="button" id="pubSuggest">Use suggested schedule</button></div>` : ''}
      ${!LIVE ? `<div class="notice">Preview mode: no PackRegistry address is configured, so the pack is saved in this browser instead of on-chain.</div>` : ''}
      <div class="pub-steps">
        <div class="pub-step" data-step="wallet"><span class="ic">1</span><div>Wallet on ${esc(NET.name)}<small id="ps-wallet">${!hasMetaMask() ? 'MetaMask is needed to publish.' : wallet.account ? short(wallet.account) : 'Connect MetaMask'}</small></div><span></span></div>
        <div class="pub-step" data-step="ipfs"><span class="ic">2</span><div>Upload pack.json to IPFS<small id="ps-ipfs">${CONFIG.worker ? 'Pinned through the Remixly Worker' : 'No Worker: kept in this browser only'}</small></div><span></span></div>
        <div class="pub-step" data-step="tx"><span class="ic">3</span><div>Publish on BOT Chain<small id="ps-tx">publish(title, sourceHash, packHash, cid, 6)</small></div><span></span></div>
      </div>
      <div class="onchain" id="onchain"><b>title</b> ${esc(title)}<br><b>sourceHash</b> ${hashOf(S.source.text).slice(0, 18)}…<br><b>packHash</b> computed on publish<br><b>formats</b> 6 · <b>gas only</b>, no tokens</div>
      <div id="pubErr"></div>
      <div class="cta-row" style="justify-content:flex-end">${!hasMetaMask() && LIVE ? `<a class="btn tan" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask ↗</a>` : ''}<button class="btn ghost" type="button" data-close>Cancel</button><button class="btn" type="button" id="goPub" ${!hasMetaMask() && LIVE ? 'disabled' : ''}>${LIVE && wallet.account && !onRightChain() ? 'Switch to BOT Chain' : 'Publish pack'}</button></div>
    </div></div>`);
  const el = m.el;
  el.querySelector('#pubSuggest')?.addEventListener('click', (e) => { applySchedule(suggestedSchedule()); e.target.closest('.notice').remove(); });
  const step = (k, state, msg) => { const s = el.querySelector(`[data-step="${k}"]`); s.className = `pub-step ${state}`; s.querySelector('.ic').textContent = state === 'ok' ? '✓' : state === 'err' ? '!' : state === 'run' ? '' : s.querySelector('.ic').textContent; if (msg != null) el.querySelector(`#ps-${k}`).innerHTML = msg; };
  const btn = el.querySelector('#goPub');
  if (DEMO) { btn.disabled = true; btn.textContent = 'Demo · publishing is off'; return; }
  btn.addEventListener('click', async () => {
    btn.disabled = true; el.querySelector('#pubErr').innerHTML = '';
    let at = 'wallet';
    try {
      if (LIVE) {
        step('wallet', 'run');
        await connect();
        if (!onRightChain()) { step('wallet', 'run', 'Approve the switch to BOT Chain in MetaMask'); await switchChain(); }
        step('wallet', 'ok', short(wallet.account));
      } else step('wallet', 'ok', wallet.account ? short(wallet.account) : 'Preview (no wallet needed)');
      at = 'ipfs';
      const pack = currentPack();
      if (!cached) { step('ipfs', 'run', 'Uploading…'); cached = await storePack(pack); }
      step('ipfs', 'ok', cached.cid ? `cid ${cached.cid.slice(0, 16)}…` : 'Saved in this browser');
      el.querySelector('#onchain').innerHTML = `<b>title</b> ${esc(pack.title)}<br><b>sourceHash</b> ${hashOf(S.source.text)}<br><b>packHash</b> ${cached.packHash}<br><b>cid</b> ${esc(cached.cid || '—')}<br><b>formats</b> 6`;
      at = 'tx';
      step('tx', 'run', LIVE ? 'Confirm in MetaMask…' : 'Saving…');
      const { id, tx } = await registry.publish({ title: pack.title, sourceHash: hashOf(S.source.text), packHash: cached.packHash, cid: cached.cid, formats: FORMAT_IDS.length }, (h) => step('tx', 'run', `Pending… <a href="${explorerTx(h)}" target="_blank" rel="noopener">view tx ↗</a>`));
      step('tx', 'ok', tx ? `Pack #${id} · <a href="${explorerTx(tx)}" target="_blank" rel="noopener">view tx ↗</a>` : `Pack #${id} (preview)`);
      S.published = { id, tx }; save(); steps();
      remiOnce(el, 'is-bounce', 1800); remiOnce(document, 'is-bounce', 1800);
      btn.textContent = 'Open pack page →'; btn.disabled = false;
      btn.onclick = () => { m.close(); navigate(`p/${id}`); };
      toast('Pack published 🎉');
      setTimeout(() => { if (el.isConnected) { m.close(); navigate(`p/${id}`); } }, 1800);
    } catch (e) {
      console.error(e);
      step(at, 'err');
      el.querySelector('#pubErr').innerHTML = `<div class="notice err">${esc(txMessage(e))}</div>`;
      btn.disabled = false; btn.textContent = 'Retry';
    }
  });
}

// ---------- keyboard ----------
function commands() {
  const id = FORMAT_IDS.includes(S.sel) ? S.sel : null;
  const f = id && formatById(id);
  return [
    ...(id ? ACTIONS.map((a) => ({ label: `${a.label.replace('↻ ', '')} ${f.file}`, hint: a.id === 'regenerate' ? '↻' : 'tweak', run: () => doTweak(id, a.id) })) : []),
    ...(id ? [{ label: `Copy ${f.file}`, hint: 'copy', run: () => copy(formatText(id, S.formats[id]), 'Copied') }] : []),
    ...['pack', 'source', ...FORMAT_IDS].map((k) => ({ label: `Open ${k === 'pack' ? 'pack/' : k === 'source' ? 'source.md' : formatById(k).file}`, hint: 'file', run: () => select(k) })),
    { label: 'Suggested schedule', hint: 'calendar', run: () => applySchedule(suggestedSchedule()) },
    { label: 'Download Markdown', hint: '.md', run: downloadMd },
    { label: 'Download carousel PNGs', hint: '.zip', run: downloadZip },
    { label: 'Publish pack', hint: 'tx', run: openPublish },
  ];
}

// ---------- demo (the "Watch reel" modal plays this) ----------
async function demo() {
  const caption = document.createElement('div');
  caption.className = 'toast show'; caption.style.bottom = '16px';
  const say = (t) => { caption.textContent = t; };
  document.body.append(caption);
  const s = SAMPLES.blog;
  say('1 · Paste a post');
  await sleep(500);
  const ta = $('#src');
  for (let i = 0; i <= s.source.text.length && root.isConnected; i += 38) { ta.value = s.source.text.slice(0, i); S.input.text = ta.value; meta(); await sleep(16); }
  S.input.text = s.source.text; meta();
  S.summary = ['A content week: one blog post becomes six formats over seven days.', 'The rule: no new facts. Every format uses only what is in the post.']; S.checkedFor = S.input.text; drawSummary();
  await sleep(900); say('2 · Pick a voice');
  $('[data-tone="founder"]').click(); await sleep(400);
  $('#aud').value = S.voice.audience = 'small teams that blog'; await sleep(900);
  say('3 · Remix: six formats appear');
  S.source = { kind: 'text', title: s.source.title, text: s.source.text, url: '', words: words(s.source.text) };
  S.title = s.source.title; S.formats = {}; S.status = Object.fromEntries(FORMAT_IDS.map((id) => [id, 'busy'])); S.schedule = {}; S.sel = 'pack'; S.phase = 'work';
  viewTransition(renderWork);
  await runRemix(FORMAT_IDS, s.formats);
  await sleep(900);
  for (const [id, t] of [['x', '4 · Edit with live counters'], ['linkedin', '4 · LinkedIn, Telegram, email…'], ['carousel', '4 · Carousel slides as PNGs'], ['video', '4 · A 30s video script']]) {
    if (!root.isConnected) return caption.remove();
    say(t); select(id); await sleep(2300);
  }
  say('5 · Plan the week'); $('#cal')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); await sleep(900);
  applySchedule(suggestedSchedule()); await sleep(2600);
  say('6 · Publish the pack on BOT Chain'); window.scrollTo({ top: 0, behavior: 'smooth' }); await sleep(800);
  if (root.isConnected) openPublish();
  await sleep(3500);
  say('Demo · nothing was published'); await sleep(2500);
  caption.remove();
}

// ---------- mount ----------
export async function mount(view) {
  root = view;
  S = DEMO ? fresh() : { ...fresh(), ...store.get(K, {}) };
  if (S.phase === 'work' && !S.source) S.phase = 'setup';
  for (const id of FORMAT_IDS) if (S.status[id] === 'busy') S.status[id] = S.formats[id] ? 'ok' : 'fail';
  // hand-offs from the homepage
  if (params.get('url')) { S = { ...fresh(), voice: S.voice, srcTab: 'link' }; S.input.url = params.get('url'); }
  if (params.has('paste')) { const t = store.get(`${CONFIG.storageKey}.handoff`, ''); store.del(`${CONFIG.storageKey}.handoff`); if (t) { S = { ...fresh(), voice: S.voice }; S.input.text = t; } }
  if (params.has('url') || params.has('paste')) history.replaceState(null, '', href('app'));
  shell();
  if (S.phase === 'work') renderWork(); else renderSetup();
  if (params.get('url') && S.srcTab === 'link') setTimeout(() => $('#linkForm')?.requestSubmit(), 200);
  cleanups.push(onKey((k) => {
    if (S.phase !== 'work') return false;
    if (k === 'j') { nextFile(); return true; }
    if (k === 'k') { palette(commands(), 'Regenerate, shorter, copy, open a file…'); return true; }
    return false;
  }));
  if (DEMO) demo();
  return { cleanup: () => { cleanups.forEach((fn) => fn()); cleanups = []; sortables.forEach((s) => s.destroy()); sortables = []; clearTimeout(saveT); } };
}
