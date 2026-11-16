// The website: 9 sections after the Content Architecture layout, with GSAP (ScrollTrigger, SplitText, Flip) + Lenis.
/* global gsap, ScrollTrigger, SplitText, Flip */
import { $, $$, esc, fmt, pad, store, copy, reducedMotion, viewTransition } from './ui.js';
import { remi } from './remi.js';
import { FORMATS, DAYS, formatText, formatById, scheduleLine, words } from './formats.js';
import { SAMPLES } from './samples.js';
import { slideHTML, slideName } from './carousel.js';
import { registry, LIVE } from './chain.js';
import { href, navigate, openReel, palette, onKey, stats } from './main.js';
import { CONFIG } from './config.js';

const COST = [
  { k: 'Rewriting for X', hrs: 1.5, items: [['Hook that stands alone', '0.5'], ['Cutting to 280, post by post', '1']] },
  { k: 'LinkedIn version', hrs: 1, items: [['New intro, new structure', '0.5'], ['CTA + a question that lands', '0.5']] },
  { k: 'Designing a carousel', hrs: 1.5, items: [['One line per slide', '0.5'], ['Template, export 8 PNGs', '1']] },
  { k: 'Writing a script', hrs: 1, items: [['Hook in 3 seconds', '0.5'], ['Beats + timings to 30s', '0.5']] },
  { k: 'Email', hrs: 0.5, items: [['Subject line × 5 tries', '0.25'], ['120 words, one CTA', '0.25']] },
  { k: 'Scheduling', hrs: 0.5, items: [['Which day, which time', '0.25'], ['Copy-paste into 6 apps', '0.25']] },
];
const FEATS = [
  ['X thread', 'x', '5–8 numbered posts, each under 280 characters, with a hook that stands on its own and live counters while you edit.', '1/7 Most teams write one good post… 214/280'],
  ['LinkedIn', 'li', 'A hook, a body of short paragraphs and a CTA, inside the 3,000-character limit. The reasoning, not just the result.', 'hook · body · cta — 1,284 / 3,000'],
  ['Telegram', 'tg', 'An announcement your channel will actually read: one headline, emoji bullets, a link back to the full post.', '📣 headline · 🔹 bullets · 👉 link'],
  ['Carousel PNGs', 'ig', '6–8 slides, title plus one line each, rendered on a 1080×1350 template. Download every slide as PNG in one zip.', 'carousel/slide-01…08.png'],
  ['Video script', 'vid', 'A 30-second script with a hook in the first 3 seconds, timed beats and a CTA. Read it straight to camera.', '0–3s hook · 3–25s beats · 25–30s cta'],
  ['Email', 'mail', 'A subject line without clickbait and a 120-word blurb with one clear call to action, for the channel you own.', 'subject · 120 words · 1 cta'],
  ['7-day calendar', '', 'Drag every format onto Mon–Sun, or take the suggested schedule. Times default to Asia/Bangkok.', scheduleLine()],
  ['Your voice', '', 'Friendly, Professional, Bold, Playful or Founder-style. Add a sample post and an audience, and it writes like you.', 'tone: founder · audience: BOT Chain builders'],
  ['3 languages', '', 'English, Bahasa Indonesia or Thai, for all six formats at once. Counters count Thai characters correctly.', 'en · id · th'],
  ['On-chain pack record', '', 'Publish the pack and BOT Chain records its title, hashes and IPFS cid. Mark each post live with its link.', 'publish() · markPosted() · chain 677'],
];
const FAQ = [
  ['Does it post for me?', 'No. Remixly never posts anywhere. Every piece has [Copy] and [Open app] buttons: the app opens X, LinkedIn or Telegram with your text ready, and you press post yourself. Then paste the live link to mark it posted.'],
  ['Will it make things up?', 'It is told to use only facts, numbers, names and quotes from your source, and never to invent statistics or quotes. AI can still slip, so every piece is editable and you should read it before posting.'],
  ['Which languages?', 'English, Bahasa Indonesia and Thai. Pick one in the Voice step and all six formats come back in it. Your source can be in any of the three.'],
  ["What's on-chain?", 'When you publish, BOT Chain records the pack title, a hash of your source, a hash of the pack, its IPFS cid and the number of formats. When you mark a piece posted, the live link is recorded too. No tokens, no payments: you only pay gas.'],
  ['Can I edit everything?', 'Yes. Every post, slide, beat and subject line is editable inline, with live character counters. Regenerate one format, or make it Shorter, Punchier or add a CTA.'],
  ['Does it work for Web3 announcements?', 'Yes: launches, upgrades, AMAs, testnet calls. Telegram announcements and X threads are first-class, and the tone chips go from Professional to Bold.'],
  ['Can I use my own voice?', 'Pick a tone, add your audience, and paste a post you wrote as a "sounds like this" sample. Remixly copies the style, never the facts.'],
  ['Is my text stored?', 'Your source text stays in your browser, and the AI Worker keeps nothing. Only the finished pack you choose to publish goes to IPFS, and only hashes go on-chain.'],
];

const card = (f, i) => `<div class="fcard" data-flip-id="f${i}" style="--c:${['#232323', '#9FB6D6', '#7CC0EA', '#D6A878', '#8a8883', '#5B5A56'][i]}"><div class="fh"><i></i>${f.file}</div><div class="fb"><b></b><b></b><b></b></div></div>`;

function tpl() {
  return `
  <section class="hero ink" id="top">
    <div class="wrap">
      <div>
        <div class="eyebrow">One post in. Seven days out.</div>
        <h1 class="h1 hero-title">The posts you don't rewrite.</h1>
        <p class="lede">Paste a blog, link or transcript. Remixly writes your thread, LinkedIn post, Telegram announcement, carousel, video script and email — and plans the week.</p>
        <div class="cta-row"><a class="btn paper" href="${href('app')}" data-link>Remix a post<span class="dot"></span></a><button type="button" class="btn ghost" id="reelBtn">Watch reel</button></div>
      </div>
      <div class="stage" data-s="post" aria-hidden="true">
        <div class="stage-grid"></div>
        <span class="stage-cap">$ remixly pack --days 7</span>
        <div class="post-card"><div class="ph"></div><div class="ln t"></div><div class="ln"></div><div class="ln" style="width:88%"></div><div class="ln" style="width:70%"></div><div class="ln" style="width:92%"></div></div>
        <div class="fcards">${FORMATS.map(card).join('')}</div>
        <div class="stage-cal">${DAYS.map((d) => `<div>${d}</div>`).join('')}</div>
        <div class="stage-remi">${remi({ size: 140, cls: 'is-slow', label: 'Remi spinning' })}</div>
      </div>
    </div>
    <div class="scroll-cue"><span class="rec"></span>Scroll to dive in</div>
  </section>

  <section class="sec" id="how">
    <div class="wrap days-block">
      <div class="sec-head" style="margin:0">
        <span class="eyebrow">// 01 · paste it</span>
        <h2 class="h2 reveal-text">The next 7 days are yours.</h2>
        <p class="lede">Drop in a link to your latest post. Remixly reads it, writes six formats, and lays them on Monday to Sunday. You just post.</p>
      </div>
      <form class="remix-form" id="quickForm" novalidate>
        <h3>Remix a post right here.</h3>
        <p>A blog or article link, or paste the text itself.</p>
        <div class="input-row">
          <input class="field" id="quickInput" type="text" placeholder="https://yourblog.com/latest-post" aria-label="Link or text to remix" autocomplete="off">
          <button class="btn paper" type="submit">Remix it</button>
        </div>
        <div class="term-line"><b>$</b> remixly pack --source <span id="quickEcho">link</span> --days 7 --formats 6</div>
      </form>
    </div>
  </section>

  <section class="sec cost" id="cost">
    <div class="wrap">
      <div class="cost-left">
        <span class="eyebrow muted">// 02 · the real cost</span>
        <h2 class="h2">~6 hours lost<br>per post.</h2>
        <p class="lede">Rewriting one post for every channel is the part nobody plans for and everybody redoes. Every single time.</p>
        <div class="big-num" aria-live="off"><span class="tilde">~</span><span id="costNum">00</span></div>
        <div class="big-cap"><span id="costCap">Hours lost per post</span><span class="tag" id="costTag">6 formats by hand</span></div>
      </div>
      <div class="receipt" id="receipt">
        <div class="rc-head"><span>Estimate</span><span>Never scheduled</span></div>
        ${COST.map((b, i) => `<div class="rc-block"><span class="fill"></span>
          <div class="day"><span>Block ${pad(i + 1, 2)}</span><span>~${b.hrs} hrs</span></div>
          <div class="rc-row"><span>${esc(b.k)}</span><span class="lead"></span><span>~${b.hrs}</span></div>
          ${b.items.map(([t, h]) => `<div class="rc-row muted"><span>${esc(t)}</span><span class="lead"></span><span>${h}</span></div>`).join('')}
        </div>`).join('')}
        <div class="rc-inf"><div>Every new post</div><div class="rc-row"><span>You start from zero</span><span class="lead"></span><span>∞</span></div></div>
        <div class="rc-collapse"><div class="row"><span>Remixly</span><span>All of the above</span></div><div class="row"><big>2 minutes</big><span>6 / 6 formats</span></div><div class="row muted" style="color:var(--on-ink-3)"><span>$ remixly pack --days 7</span><span>✓ done</span></div></div>
      </div>
    </div>
  </section>

  <section class="sec" id="formats" style="padding-top:40px">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow">// 03 · what you get</span>
        <h2 class="h2 reveal-text">Every format already made.<br>So you can skip to posting.</h2>
        <p class="lede">One source, six formats, a calendar and a record on BOT Chain. Written in your voice, checked against every platform limit, and only from the facts you gave it.</p>
      </div>
      <div class="feat-grid">
        ${FEATS.map(([t, c, d, demo], i) => `<article class="feat"><div class="num"><span class="chip-dot c-${c || 'x'}" style="${c ? '' : 'background:var(--grey)'}"></span><b data-num="${pad(i + 1)}">${pad(i + 1)}</b><span>/ ${esc(t)}</span></div><p>${esc(d)}</p><div class="demo">${esc(demo)}</div></article>`).join('')}
      </div>
    </div>
  </section>

  <section class="browser-sec" id="sample">
    <div class="wrap">
      <div class="browser">
        <div class="br-top">
          <div class="toggle" role="group" aria-label="Sample pack">${Object.entries(SAMPLES).map(([k, s], i) => `<button type="button" data-sample="${k}" aria-pressed="${i === 0}">${esc(s.label)}</button>`).join('')}</div>
          <div class="center">This is the actual pack.</div>
          <div class="hints"><span class="kbd">⌘J</span><span style="font:500 11px var(--mono);opacity:.6">next file</span><span class="kbd">⌘K</span><span style="font:500 11px var(--mono);opacity:.6">commands</span></div>
        </div>
        <div class="br-body">
          <nav class="tree" id="brTree" aria-label="Sample pack files"></nav>
          <div class="br-main">
            <div class="br-file"><span id="brName">source.md</span><button type="button" class="copybtn" id="brCopy">copy</button></div>
            <div class="code" id="brCode" data-lenis-prevent></div>
            <div class="terminal"><div class="t-label">Terminal</div><div id="brTerm"></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec" id="packs">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow">// 04 · on-chain</span>
        <h2 class="h2 reveal-text">The posts that get published.</h2>
        <p class="lede">Real packs from the PackRegistry on BOT Chain, newest first. Each one shows how many of its posts went live.</p>
      </div>
      <div class="pack-grid" id="packGrid"><div class="empty"><span class="label">Reading the registry…</span></div></div>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="price ink">
        <div class="price-l">
          <span class="eyebrow" style="color:var(--on-ink-3)">// 05 · pricing</span>
          <div><div class="amount">Free,</div><div class="h2" style="margin-top:8px">per pack.</div></div>
          <p class="lede">No plan, no seats, no credits. You only pay gas to publish.</p>
          <div class="cta-row"><a class="btn paper" href="${href('app')}" data-link>Remix a post</a></div>
        </div>
        <div class="price-r">
          <span class="eyebrow" style="color:var(--on-ink-3);margin-bottom:8px">Included in every pack</span>
          <div class="inc">All 6 formats</div><div class="inc">Unlimited regenerates</div><div class="inc">PNG carousel + Markdown export</div><div class="inc">7-day calendar</div><div class="inc">On-chain record on BOT Chain</div>
          <p class="mono" style="font-size:12px;color:var(--on-ink-3);margin:18px 0 0">$ gas only · chain 677 · no tokens · no payments</p>
        </div>
      </div>
    </div>
  </section>

  <section class="sec faq" id="faq">
    <div class="wrap">
      <div class="sec-head" style="align-content:start">
        <span class="eyebrow">// 06 · questions</span>
        <h2 class="h2 reveal-text">Before you remix</h2>
        <p class="lede">Short answers. Anything else, ask us on Telegram.</p>
      </div>
      <div class="faq-list">${FAQ.map(([q, a], i) => `<div class="faq-item"><button type="button" aria-expanded="false" aria-controls="faq${i}"><span class="q">Q.${pad(i + 1)}</span><span>${esc(q)}</span><span class="pm">+</span></button><div class="faq-a" id="faq${i}" role="region"><div><p>${esc(a)}</p></div></div></div>`).join('')}</div>
    </div>
  </section>

  <section class="sec closing" style="padding-top:20px">
    <div class="wrap" style="display:grid;gap:30px;justify-items:start">
      <span class="eyebrow muted">// 07 · ${LIVE ? 'live from PackRegistry' : 'preview: packs in this browser'}</span>
      <div class="count"><span id="closeCount">0</span><small>packs published</small></div>
      <a class="btn" href="${href('app')}" data-link>Remix a post</a>
    </div>
  </section>`;
}

// ---------- section 5: the sample pack browser ----------
function sampleFiles(s) {
  const files = [{ name: 'source.md', id: 'source' }];
  for (const f of FORMATS) {
    if (f.id === 'carousel') { files.push({ dir: 'carousel/' }); s.formats.carousel.slides.forEach((_, i) => files.push({ name: slideName(i), id: 'slide', i, ind: 2 })); }
    else files.push({ name: f.file, id: f.id });
  }
  return files;
}
function codeLines(s, file) {
  if (file.id === 'source') return [`# ${s.source.title}`, '', ...s.source.text.split('\n').slice(1).filter((l, i, a) => l || a[i - 1])].map((t) => ({ t, c: t.startsWith('#') ? 'h' : '' }));
  const f = formatById(file.id);
  const head = [{ t: `# ${f.label}`, c: 'h' }, { t: `<!-- ${s.voice.tone} · ${s.voice.lang} · ${s.voice.audience} -->`, c: 'c' }, { t: '' }];
  if (file.id === 'x') return [...head, ...s.formats.x.posts.flatMap((p, i, a) => [{ t: `${i + 1}/${a.length}  (${[...p].length}/280)`, c: 'm' }, { t: p }, { t: '' }])];
  return [...head, ...formatText(file.id, s.formats[file.id]).split('\n').map((t) => ({ t, c: /^(Subject:|HOOK|CTA|\d+–\d+s:)/.test(t) ? 'm' : '' }))];
}
function initBrowser(cleanups) {
  let key = 'blog', cur = 0, files = [];
  const tree = $('#brTree'), code = $('#brCode'), name = $('#brName'), term = $('#brTerm');
  const pickable = () => files.map((f, i) => (f.name ? i : -1)).filter((i) => i >= 0);
  const drawTree = () => {
    tree.innerHTML = `<div class="dir"><span class="ico">▾</span>pack/</div>` + files.map((f, i) => f.dir
      ? `<div class="dir ind"><span class="ico">▾</span>${f.dir}</div>`
      : `<button type="button" class="ind" style="${f.ind ? 'padding-left:44px' : ''}" data-i="${i}" aria-current="${i === cur}"><span class="ico">${f.id === 'slide' ? '▣' : '≡'}</span>${f.name}</button>`).join('');
  };
  const show = (i, animate = true) => {
    cur = i;
    const s = SAMPLES[key], f = files[i];
    const paint = () => {
      name.textContent = (f.id === 'slide' ? 'carousel/' : '') + f.name;
      $$('button', tree).forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.i) === i)));
      if (f.id === 'slide') {
        const sl = s.formats.carousel.slides;
        code.innerHTML = `<div class="slide-view"><div class="slide-thumb" style="width:min(340px,80%);--k:1">${slideHTML(sl[f.i], f.i, sl.length)}</div><p class="mono" style="font-size:12px;color:var(--on-ink-3)">1080 × 1350 PNG · ${esc(sl[f.i].title)}</p></div>`;
        const th = code.querySelector('.slide-thumb');
        th.firstElementChild.style.transform = `scale(${th.clientWidth / 1080})`;
      } else {
        code.innerHTML = codeLines(s, f).map((l, n) => `<div class="ln"><i>${n + 1}</i><span class="${l.c || ''}">${esc(l.t) || ' '}</span></div>`).join('');
      }
      code.scrollTop = 0;
    };
    animate ? viewTransition(paint) : paint();
  };
  const load = (k, listing = false) => {
    key = k;
    files = sampleFiles(SAMPLES[k]);
    $$('[data-sample]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sample === k)));
    drawTree();
    show(0, false);
    const s = SAMPLES[k];
    term.innerHTML = `~/remixly-pack &gt; <b>remixly pack</b> --source "${esc(s.source.title)}" --tone ${s.voice.tone} --days 7<br>~/remixly-pack &gt; ✓ ${FORMATS.length} formats · ${s.formats.carousel.slides.length} slides · ${words(s.source.text)} words in <span class="cursor"></span>`;
    if (listing && window.gsap && !reducedMotion()) gsap.from($$('.dir, button', tree), { opacity: 0, x: -8, duration: .25, stagger: .06, ease: 'steps(3)' });
  };
  const next = (d = 1) => { const p = pickable(); show(p[(p.indexOf(cur) + d + p.length) % p.length]); };
  tree.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) show(Number(b.dataset.i)); });
  $$('[data-sample]').forEach((b) => b.addEventListener('click', () => load(b.dataset.sample, true)));
  $('#brCopy').addEventListener('click', () => copy(code.innerText.replace(/^\d+\n/gm, ''), 'File copied'));
  load('blog');
  // files list in like a terminal when the browser scrolls into view
  if (window.ScrollTrigger && !reducedMotion()) ScrollTrigger.create({ trigger: '.browser', start: 'top 75%', once: true, onEnter: () => gsap.from($$('.dir, button', tree), { opacity: 0, x: -8, duration: .25, stagger: .07, ease: 'steps(3)' }) });
  const inView = () => { const r = $('.browser')?.getBoundingClientRect(); return r && r.top < innerHeight * .8 && r.bottom > innerHeight * .2; };
  cleanups.push(onKey((k) => {
    if (!$('.browser')) return false;
    if (k === 'j' && inView()) { next(); return true; }
    if (k === 'k') {
      palette([
        ...pickable().map((i) => ({ label: `Open ${(files[i].id === 'slide' ? 'carousel/' : '') + files[i].name}`, hint: 'file', run: () => { show(i); } })),
        { label: 'Copy this file', hint: 'copy', run: () => $('#brCopy').click() },
        { label: `Switch to ${key === 'blog' ? 'Product update' : 'Blog post'} sample`, hint: 'toggle', run: () => load(key === 'blog' ? 'update' : 'blog', true) },
        { label: 'Remix your own post', hint: '/app', run: () => navigate('app') },
        { label: 'Watch reel', hint: '30s', run: openReel },
      ], 'Open a file or run a command…');
      return true;
    }
    return false;
  }));
}

// ---------- section 6: packs from the registry ----------
async function initPacks() {
  const grid = $('#packGrid');
  try {
    const { items } = await registry.recent(6);
    if (!grid.isConnected) return;
    if (!items.length) {
      grid.innerHTML = `<div class="empty"><span class="label">${LIVE ? 'PackRegistry · BOT Chain' : 'Preview mode · no contract configured yet'}</span><h3 class="h3">No packs ${LIVE ? 'on-chain' : 'here'} yet. Yours could be the first.</h3><a class="btn" href="${href('app')}" data-link>Remix a post</a></div>`;
      return;
    }
    grid.innerHTML = items.map((p) => {
      const pct = p.formats ? p.posted / p.formats : 0;
      return `<a class="pack-card" href="${href(`p/${p.id}`)}" data-link>
        <div class="top label"><span>Pack #${pad(p.id)}</span><span>${new Date(p.at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div>
        <h3>${esc(p.title)}</h3>
        <div class="chips">${FORMATS.slice(0, p.formats).map((f) => `<span class="chip c-${f.chip}">${f.short}</span>`).join('')}</div>
        <div class="progress"><div class="label" style="display:flex;justify-content:space-between"><span>${p.posted} / ${p.formats} posted</span><span>${Math.round(pct * 100)}%</span></div><div class="bar"><i style="transform:scaleX(${pct})"></i></div></div>
      </a>`;
    }).join('');
    if (window.gsap && !reducedMotion()) gsap.from($$('.pack-card', grid), { y: 24, opacity: 0, duration: .6, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: grid, start: 'top 85%' } });
  } catch {
    grid.innerHTML = `<div class="empty"><span class="label">Couldn't reach BOT Chain right now</span><h3 class="h3">The registry is quiet. Try again in a moment.</h3></div>`;
  }
}

// ---------- animations ----------
function heroAnim(cleanups) {
  const stage = $('.stage');
  const cards = $$('.fcard', stage);
  const post = $('.post-card', stage), cal = $('.stage-cal', stage), rm = $('.stage-remi .remi', stage);
  if (reducedMotion() || !window.Flip) { stage.dataset.s = 'cal'; cal.style.opacity = 1; post.style.opacity = 0; return; }
  const split = new SplitText('.hero-title', { type: 'lines', linesClass: 'split-line' });
  const lines = split.lines.map((l) => { const w = document.createElement('span'); w.style.display = 'block'; w.innerHTML = l.innerHTML; l.innerHTML = ''; l.append(w); return w; });
  gsap.from(lines, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: .08, delay: .1 });
  gsap.from(['.hero .eyebrow', '.hero .lede', '.hero .cta-row', '.scroll-cue'], { y: 16, opacity: 0, duration: .8, stagger: .08, delay: .35, ease: 'power3.out' });
  gsap.from(post, { y: 30, opacity: 0, duration: .9, delay: .3, ease: 'power3.out' });

  let alive = true, timer;
  const flipTo = (s, opts = {}) => {
    const st = Flip.getState(cards);
    stage.dataset.s = s;
    return Flip.from(st, { duration: .95, ease: 'power3.inOut', stagger: .06, ...opts });
  };
  const cycle = () => {
    if (!alive) return;
    const tl = gsap.timeline({ onComplete: () => { timer = setTimeout(cycle, 600); } });
    tl.add(() => rm.classList.replace('is-slow', 'is-spin'), 0.4)
      .to(post, { scale: .85, opacity: 0, duration: .5, ease: 'power2.in' }, 0.4)
      .add(() => flipTo('fan'), 0.7)
      .add(() => rm.classList.replace('is-spin', 'is-slow'), 2.2)
      .to(cal, { opacity: 1, duration: .6 }, 2.6)
      .add(() => flipTo('cal', { stagger: .08 }), 2.7)
      .to({}, { duration: 2.2 }, 3.8)
      .to(cards, { opacity: 0, y: 10, duration: .4, stagger: .03 }, 6)
      .to(cal, { opacity: 0, duration: .4 }, 6.1)
      .add(() => { stage.dataset.s = 'post'; gsap.set(cards, { clearProps: 'all' }); }, 6.6)
      .fromTo(post, { scale: .92, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'power3.out' }, 6.7);
  };
  timer = setTimeout(cycle, 1300);
  cleanups.push(() => { alive = false; clearTimeout(timer); split.revert(); });
}
function costAnim() {
  const num = $('#costNum'), cap = $('#costCap'), tag = $('#costTag');
  const blocks = $$('.rc-block'), fills = blocks.map((b) => $('.fill', b));
  const collapse = $('.rc-collapse'), inf = $('.rc-inf'), head = $('.rc-head');
  if (reducedMotion() || !window.ScrollTrigger) { num.textContent = '06'; return; }
  const total = COST.reduce((n, b) => n + b.hrs, 0);
  const counter = { v: 0 };
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#cost', start: 'top 20%', end: '+=170%', scrub: .6, pin: matchMedia('(min-width: 901px)').matches, anticipatePin: 1 } });
  let acc = 0;
  blocks.forEach((b, i) => {
    acc += COST[i].hrs;
    tl.to(fills[i], { scaleX: 1, duration: 1, ease: 'none', onStart: () => b.classList.add('done'), onReverseComplete: () => b.classList.remove('done') }, i)
      .to(counter, { v: acc, duration: 1, ease: 'none', onUpdate: () => { num.textContent = pad(Math.round(counter.v), 2); } }, i);
  });
  tl.to(blocks, { scaleY: .2, opacity: 0, duration: .8, stagger: .05, ease: 'power2.in' }, blocks.length + .4)
    .to([inf, head], { opacity: .15, duration: .5 }, blocks.length + .4)
    .fromTo(collapse, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .8, ease: 'power3.out' }, blocks.length + 1)
    .add(() => { const back = tl.scrollTrigger?.direction < 0; num.textContent = back ? pad(total, 2) : '02'; cap.textContent = back ? 'Hours lost per post' : 'Minutes with Remixly'; tag.textContent = back ? '6 formats by hand' : '6 formats, done'; tag.classList.toggle('ink', !back); }, blocks.length + 1.1)
    .to({}, { duration: .6 });
}
function featAnim() {
  if (reducedMotion() || !window.ScrollTrigger) return;
  $$('.feat').forEach((el, i) => {
    const n = $('[data-num]', el);
    gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, {
      clipPath: 'inset(0 0% 0 0)', duration: .9, ease: 'power3.inOut', delay: (i % 2) * .08,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onStart: () => { // tick the number up like a counter: 000 → 001 …
        const target = Number(n.dataset.num); const o = { v: 0 };
        gsap.to(o, { v: target, duration: .7, ease: 'steps(' + Math.max(1, target) + ')', onUpdate: () => { n.textContent = pad(Math.round(o.v)); } });
      },
    });
  });
}
function textReveals() {
  if (reducedMotion() || !window.SplitText) return;
  $$('.reveal-text').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'split-line' });
    s.lines.forEach((l) => { const w = document.createElement('span'); w.style.display = 'block'; w.innerHTML = l.innerHTML; l.innerHTML = ''; l.append(w); });
    gsap.from($$('.split-line > span', el), { yPercent: 105, duration: .9, stagger: .08, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  gsap.from('.remix-form', { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.remix-form', start: 'top 85%', once: true } });
  gsap.from('.price', { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.price', start: 'top 85%', once: true } });
}
async function closingCounter() {
  const el = $('#closeCount');
  const s = await stats();
  const total = s?.total ?? 0;
  if (!el?.isConnected) return;
  if (reducedMotion() || !window.ScrollTrigger) { el.textContent = fmt(total); return; }
  const o = { v: 0 };
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: total, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(Math.round(o.v)); } }) });
  ScrollTrigger.refresh();
}

// ---------- mount ----------
export function mount(view) {
  view.innerHTML = tpl();
  const cleanups = [];
  $('#reelBtn').addEventListener('click', openReel);
  const qi = $('#quickInput');
  qi.addEventListener('input', () => { $('#quickEcho').textContent = /^https?:\/\//i.test(qi.value.trim()) ? 'link' : qi.value.trim() ? 'text' : 'link'; });
  $('#quickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = qi.value.trim();
    if (!v) { qi.focus(); return; }
    if (/^https?:\/\/\S+$/i.test(v)) navigate(`app?url=${encodeURIComponent(v)}`);
    else { store.set(`${CONFIG.storageKey}.handoff`, v); navigate('app?paste=1'); }
  });
  $$('.faq-item button').forEach((b) => b.addEventListener('click', () => {
    const it = b.parentElement; const open = !it.classList.contains('open');
    it.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    setTimeout(() => window.ScrollTrigger?.refresh(), 320);
  }));
  heroAnim(cleanups);
  costAnim();
  featAnim();
  textReveals();
  initBrowser(cleanups);
  initPacks();
  closingCounter();
  return { cleanup: () => cleanups.forEach((fn) => fn()) };
}
