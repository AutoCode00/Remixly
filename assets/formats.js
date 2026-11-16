// Pure logic shared by the browser and the Worker: the six formats, limits, cleaning, Markdown export,
// the canonical pack JSON, the suggested schedule and the offline (rule-based, no AI) remix.
// No DOM here.

export const FORMATS = [
  { id: 'x', file: 'x-thread.md', label: 'X thread', short: 'Thread', platform: 'X', chip: 'x' },
  { id: 'linkedin', file: 'linkedin.md', label: 'LinkedIn post', short: 'LinkedIn', platform: 'LinkedIn', chip: 'li' },
  { id: 'telegram', file: 'telegram.md', label: 'Telegram announcement', short: 'Telegram', platform: 'Telegram', chip: 'tg' },
  { id: 'carousel', file: 'carousel/', label: 'Instagram carousel', short: 'Carousel', platform: 'Instagram', chip: 'ig' },
  { id: 'video', file: 'video-script.md', label: '30s video script', short: 'Video', platform: 'Reels / Shorts / TikTok', chip: 'vid' },
  { id: 'email', file: 'email.md', label: 'Email blurb', short: 'Email', platform: 'Email', chip: 'mail' },
];
export const FORMAT_IDS = FORMATS.map((f) => f.id);
export const formatById = (id) => FORMATS.find((f) => f.id === id);

export const LIMITS = {
  xPost: 280, xMin: 5, xMax: 8,
  linkedin: 3000,
  telegram: 4096,
  slideTitle: 60, slideLine: 120, slidesMin: 6, slidesMax: 8,
  videoWords: 85, videoLine: 220,
  emailSubject: 70, emailWords: 120,
  hashtags: 2,
  minWords: 80, maxWords: 6000, hardMaxWords: 20000,
  title: 60,
};

export const TONES = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'bold', label: 'Bold' },
  { id: 'playful', label: 'Playful' },
  { id: 'founder', label: 'Founder-style' },
];
export const LANGS = [
  { id: 'en', label: 'English', name: 'English' },
  { id: 'id', label: 'Bahasa Indonesia', name: 'Bahasa Indonesia' },
  { id: 'th', label: 'Thai', name: 'Thai' },
];
export const ACTIONS = [
  { id: 'regenerate', label: '↻ Regenerate' },
  { id: 'shorter', label: 'Shorter' },
  { id: 'punchier', label: 'Punchier' },
  { id: 'cta', label: 'Add CTA' },
];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const TIMEZONE = 'Asia/Bangkok';

// ---------- small text helpers ----------
export const len = (s) => [...String(s ?? '')].length; // code points, so emoji count once
export const words = (s) => (String(s ?? '').trim().match(/\S+/g) || []).length;
const str = (v, max = 4000) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export function clip(s, max) {
  s = String(s ?? '').trim();
  if (len(s) <= max) return s;
  const cut = [...s].slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–-]+$/, '') + '…';
}
export function clipWords(s, max) {
  const w = String(s ?? '').trim().split(/(\s+)/);
  let n = 0, out = '';
  for (const part of w) {
    if (/\S/.test(part)) { if (n >= max) return out.trim().replace(/[,;:–-]+$/, '') + '…'; n++; }
    out += part;
  }
  return out.trim();
}
/** Keeps the first `max` hashtags in a set of strings and drops the rest (no hashtag spam). */
export function capHashtags(texts, max = LIMITS.hashtags) {
  let seen = 0;
  return texts.map((t) => String(t ?? '').replace(/(^|\s)#[\p{L}\p{N}_]+/gu, (m) => (++seen <= max ? m : '')).replace(/[ \t]{2,}/g, ' ').trim());
}

// ---------- cleaning (AI output, imported JSON, edits) ----------
const arr = (v) => (Array.isArray(v) ? v : []);
export function cleanFormat(id, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  switch (id) {
    case 'x': {
      let posts = arr(raw.posts).map((p) => str(typeof p === 'object' ? p?.text : p, 600)).filter(Boolean).slice(0, LIMITS.xMax);
      posts = capHashtags(posts).map((p) => p.replace(/^\s*\d+\s*[/.)]\s*\d*\s*/, '').trim()).filter(Boolean);
      return posts.length ? { posts } : null;
    }
    case 'linkedin': case 'telegram': {
      const text = capHashtags([str(raw.text, 6000)])[0];
      return text ? { text } : null;
    }
    case 'carousel': {
      const slides = arr(raw.slides).map((s) => ({ title: str(s?.title, 160), line: str(s?.line, 300) })).filter((s) => s.title || s.line).slice(0, LIMITS.slidesMax);
      return slides.length ? { slides } : null;
    }
    case 'video': {
      const beats = arr(raw.beats).map((b) => ({ at: str(b?.at, 12), line: str(b?.line, 400) })).filter((b) => b.line).slice(0, 5);
      const hook = str(raw.hook, 400), cta = str(raw.cta, 300);
      return hook || beats.length ? { hook, beats: timeBeats(beats), cta } : null;
    }
    case 'email': {
      const subject = str(raw.subject, 200), body = str(raw.body, 2000);
      return body ? { subject, body } : null;
    }
    default: return null;
  }
}
/** Spreads beats evenly between the hook (0–3s) and the CTA (25–30s). */
export function timeBeats(beats) {
  const n = beats.length;
  if (!n) return beats;
  const span = 22 / n;
  return beats.map((b, i) => ({ ...b, at: `${Math.round(3 + i * span)}–${Math.round(3 + (i + 1) * span)}s` }));
}

/** Per-format warnings: [{ field, index?, over }] when a platform limit is broken. */
export function overLimits(id, c) {
  const out = [];
  if (!c) return out;
  if (id === 'x') c.posts.forEach((p, i) => len(p) > LIMITS.xPost && out.push({ field: 'post', index: i, over: len(p) - LIMITS.xPost }));
  if (id === 'linkedin' && len(c.text) > LIMITS.linkedin) out.push({ field: 'text', over: len(c.text) - LIMITS.linkedin });
  if (id === 'telegram' && len(c.text) > LIMITS.telegram) out.push({ field: 'text', over: len(c.text) - LIMITS.telegram });
  if (id === 'carousel') c.slides.forEach((s, i) => {
    if (len(s.title) > LIMITS.slideTitle) out.push({ field: 'title', index: i, over: len(s.title) - LIMITS.slideTitle });
    if (len(s.line) > LIMITS.slideLine) out.push({ field: 'line', index: i, over: len(s.line) - LIMITS.slideLine });
  });
  if (id === 'video') { const w = videoWords(c); if (w > LIMITS.videoWords) out.push({ field: 'words', over: w - LIMITS.videoWords }); }
  if (id === 'email') {
    if (len(c.subject) > LIMITS.emailSubject) out.push({ field: 'subject', over: len(c.subject) - LIMITS.emailSubject });
    if (words(c.body) > LIMITS.emailWords) out.push({ field: 'body', over: words(c.body) - LIMITS.emailWords });
  }
  return out;
}
export const videoWords = (c) => words([c.hook, ...c.beats.map((b) => b.line), c.cta].join(' '));

/** Hard-trims a format to its platform limits (the [Shorten] fix for red counters). */
export function fitLimits(id, c) {
  if (!c) return c;
  c = structuredClone(c);
  if (id === 'x') c.posts = c.posts.map((p) => clip(p, LIMITS.xPost));
  if (id === 'linkedin') c.text = clip(c.text, LIMITS.linkedin);
  if (id === 'telegram') c.text = clip(c.text, LIMITS.telegram);
  if (id === 'carousel') c.slides = c.slides.map((s) => ({ title: clip(s.title, LIMITS.slideTitle), line: clip(s.line, LIMITS.slideLine) }));
  if (id === 'video') {
    while (videoWords(c) > LIMITS.videoWords && c.beats.length > 2) c.beats.pop();
    if (videoWords(c) > LIMITS.videoWords) c.beats = c.beats.map((b) => ({ ...b, line: clipWords(b.line, 14) }));
    c.beats = timeBeats(c.beats);
  }
  if (id === 'email') { c.subject = clip(c.subject, LIMITS.emailSubject); c.body = clipWords(c.body, LIMITS.emailWords); }
  return c;
}

// ---------- plain text / Markdown ----------
export function formatText(id, c) {
  if (!c) return '';
  switch (id) {
    case 'x': return c.posts.map((p, i) => `${i + 1}/${c.posts.length} ${p}`).join('\n\n');
    case 'linkedin': case 'telegram': return c.text;
    case 'carousel': return c.slides.map((s, i) => `Slide ${i + 1}: ${s.title}${s.line ? `\n${s.line}` : ''}`).join('\n\n');
    case 'video': return [`HOOK (0–3s): ${c.hook}`, ...c.beats.map((b) => `${b.at}: ${b.line}`), `CTA (25–30s): ${c.cta}`].join('\n');
    case 'email': return `Subject: ${c.subject}\n\n${c.body}`;
    default: return '';
  }
}
export function packMarkdown(pack) {
  const out = [`# ${pack.title}`, '', `_Remixly pack · ${FORMATS.length} formats · times in ${pack.tz || TIMEZONE}_`, ''];
  const sched = pack.schedule || {};
  out.push('## Calendar', '');
  DAYS.forEach((d, i) => {
    const items = FORMATS.filter((f) => sched[f.id]?.day === i).map((f) => `${f.short} ${sched[f.id].time}`);
    out.push(`- **${d}**: ${items.join(' · ') || '—'}`);
  });
  for (const f of FORMATS) {
    const c = pack.formats?.[f.id];
    if (!c) continue;
    out.push('', `## ${f.label} — \`${f.file}\``, '', formatText(f.id, c));
  }
  return out.join('\n') + '\n';
}

// ---------- pack JSON ----------
/** Deterministic JSON (sorted keys) so the same pack always hashes the same. */
export function canonical(v) {
  const sort = (x) => (Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort(x[k])])) : x);
  return JSON.stringify(sort(v));
}
export function buildPack({ title, source, voice, formats, schedule }) {
  const fm = {};
  for (const f of FORMATS) if (formats[f.id]) fm[f.id] = formats[f.id];
  return {
    app: 'remixly', v: 1,
    title: clip(title || 'Untitled pack', LIMITS.title),
    source: { kind: source.kind, url: source.url || '', words: words(source.text) },
    voice: { tone: voice.tone, audience: voice.audience || '', lang: voice.lang },
    formats: fm,
    order: FORMAT_IDS,
    schedule: schedule || {},
    tz: TIMEZONE,
    createdAt: new Date().toISOString(),
  };
}

// ---------- schedule ----------
export const SUGGESTED = {
  x: { day: 0, time: '09:00' },
  linkedin: { day: 1, time: '08:30' },
  carousel: { day: 2, time: '12:00' },
  telegram: { day: 3, time: '10:00' },
  video: { day: 4, time: '18:00' },
  email: { day: 5, time: '09:00' },
};
export const suggestedSchedule = () => structuredClone(SUGGESTED);
export const scheduleLine = () => Object.entries(SUGGESTED).map(([id, s]) => `${formatById(id).short} ${DAYS[s.day]}`).join(' · ');

// ---------- source helpers ----------
export function sentences(text) {
  const parts = String(text || '').replace(/\r/g, '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
    .flatMap((p) => p.split(/(?<=[.!?。])\s+(?=[\p{Lu}\p{N}"“'‘(\p{Script=Thai}])/u));
  const seen = new Set();
  return parts.map((s) => s.replace(/^[-*•#>\d.)\s]+/, '').trim()).filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k) || len(s) < 25 || len(s) > 400) return false;
    seen.add(k); return true;
  });
}
export function guessTitle(text) {
  const first = String(text || '').trim().split('\n')[0].replace(/^#+\s*/, '').trim();
  if (first && len(first) <= 90 && !/[.!?]$/.test(first)) return clip(first, LIMITS.title);
  return clip(sentences(text)[0] || 'Untitled pack', LIMITS.title);
}
/** Picks n informative sentences, kept in source order. `shift` rotates the pick (offline regenerate). */
export function keyPoints(text, n, shift = 0) {
  const all = sentences(text);
  const scored = all.map((s, i) => ({ s, i, score: (/\d/.test(s) ? 2 : 0) + (len(s) > 60 && len(s) < 200 ? 2 : 0) + (i < 3 ? 1.5 : 0) - i * 0.01 + (/\b(we|you|new|now|because|so)\b/i.test(s) ? 0.5 : 0) }));
  const ranked = scored.sort((a, b) => b.score - a.score);
  const start = ranked.length > n ? (shift * 2) % Math.max(1, ranked.length - n + 1) : 0;
  return ranked.slice(start, start + n).sort((a, b) => a.i - b.i).map((x) => x.s);
}
export function summaryOf(text) {
  const pts = keyPoints(text, 2);
  return pts.map((s) => clip(s, 140));
}

// ---------- offline remix (rule-based; only rearranges sentences from the source) ----------
const HOOK = {
  friendly: (t) => `Here's the short version of “${t}” 👇`,
  professional: (t) => `${t}: the key points.`,
  bold: (t) => `${t}. Here's what matters.`,
  playful: (t) => `Okay, quick story: ${t} 🎧`,
  founder: (t) => `Something I've wanted to share: ${t}.`,
};
const CTA = (src) => (src.url ? `Read the full post: ${src.url}` : 'What would you add? Reply and tell me.');

export function offlineFormat(id, source, voice, shift = 0) {
  const t = source.title || guessTitle(source.text);
  const hook = (HOOK[voice.tone] || HOOK.friendly)(t.replace(/[.!?]+$/, ''));
  const cta = CTA(source);
  switch (id) {
    case 'x': {
      const pts = keyPoints(source.text, 6, shift);
      return { posts: [clip(hook, 280), ...pts.slice(0, 6).map((p) => clip(p, 270)), clip(cta, 280)].slice(0, 8) };
    }
    case 'linkedin': {
      const pts = keyPoints(source.text, 5, shift);
      return { text: clip([hook, '', ...pts.flatMap((p) => [p, '']), voice.audience ? `If you're one of the ${voice.audience}, this one is for you.` : '', '', cta].filter((l, i, a) => l || a[i - 1]).join('\n').trim(), LIMITS.linkedin) };
    }
    case 'telegram': {
      const pts = keyPoints(source.text, 4, shift);
      const em = ['🔹', '⚡️', '✅', '📌'];
      return { text: [`📣 ${t}`, '', ...pts.map((p, i) => `${em[i % em.length]} ${clip(p, 200)}`), '', `👉 ${cta}`].join('\n') };
    }
    case 'carousel': {
      const pts = keyPoints(source.text, 6, shift);
      const slides = [{ title: clip(t, LIMITS.slideTitle), line: 'Swipe for the key points →' }];
      pts.slice(0, 6).forEach((p) => {
        const w = p.split(/\s+/);
        slides.push({ title: clip(w.slice(0, 6).join(' ').replace(/[,.;:]$/, ''), LIMITS.slideTitle), line: clip(p, LIMITS.slideLine) });
      });
      slides.push({ title: 'Save this for later', line: clip(source.url ? 'Full post: link in bio' : 'Follow for the next one', LIMITS.slideLine) });
      return { slides: slides.slice(0, LIMITS.slidesMax) };
    }
    case 'video': {
      const pts = keyPoints(source.text, 3, shift);
      return fitLimits('video', { hook: clipWords(hook, 14), beats: timeBeats(pts.map((p) => ({ at: '', line: clipWords(p, 20) }))), cta: clipWords(source.url ? 'Full post in the link. Follow for more.' : 'Follow for more like this.', 12) });
    }
    case 'email': {
      const pts = keyPoints(source.text, 4, shift);
      return { subject: clip(t, LIMITS.emailSubject), body: clipWords([`Hi there,`, '', pts.join(' '), '', cta].join('\n'), LIMITS.emailWords) };
    }
  }
  return null;
}
export function offlineRemix(source, voice, shift = 0) {
  return Object.fromEntries(FORMAT_IDS.map((id) => [id, offlineFormat(id, source, voice, shift)]));
}
const FILLER = /\b(really|very|just|actually|basically|literally|quite|simply|in order to|that is to say|kind of|sort of)\b\s*/gi;
const punch = (s) => s.replace(FILLER, (m) => (/in order to/i.test(m) ? 'to ' : '')).replace(/\s{2,}/g, ' ').replace(/,\s+(and|but|so)\s+/gi, '. ').trim();
export function offlineTweak(id, c, action, source, voice) {
  if (action === 'regenerate') return offlineFormat(id, source, voice, 1 + Math.floor(Math.random() * 5));
  c = structuredClone(c);
  const ctaLine = CTA(source);
  const each = (fn) => {
    if (id === 'x') c.posts = c.posts.map(fn);
    if (id === 'linkedin' || id === 'telegram') c.text = fn(c.text);
    if (id === 'carousel') c.slides = c.slides.map((s) => ({ title: fn(s.title), line: fn(s.line) }));
    if (id === 'video') { c.hook = fn(c.hook); c.beats = c.beats.map((b) => ({ ...b, line: fn(b.line) })); c.cta = fn(c.cta); }
    if (id === 'email') { c.subject = fn(c.subject); c.body = fn(c.body); }
  };
  if (action === 'punchier') each(punch);
  if (action === 'shorter') {
    if (id === 'x') c.posts = c.posts.length > LIMITS.xMin ? [c.posts[0], ...c.posts.slice(1, -1).slice(0, LIMITS.xMin - 2), c.posts.at(-1)] : c.posts.map((p) => clip(p, 200));
    if (id === 'linkedin' || id === 'telegram') { const paras = c.text.split(/\n{2,}|\n/); c.text = paras.slice(0, Math.max(3, Math.ceil(paras.length * 0.6))).join('\n\n'); }
    if (id === 'carousel') c.slides = c.slides.map((s) => ({ ...s, line: clip(s.line, 80) }));
    if (id === 'video') { c.beats = c.beats.slice(0, 2).map((b) => ({ ...b, line: clipWords(b.line, 12) })); c.beats = timeBeats(c.beats); }
    if (id === 'email') c.body = clipWords(c.body, 70);
  }
  if (action === 'cta') {
    if (id === 'x' && !c.posts.at(-1).includes(ctaLine)) c.posts.push(clip(ctaLine, 280));
    if (id === 'x') c.posts = c.posts.slice(-LIMITS.xMax);
    if ((id === 'linkedin' || id === 'telegram') && !c.text.includes(ctaLine)) c.text += `\n\n👉 ${ctaLine}`;
    if (id === 'carousel') c.slides = [...c.slides.slice(0, LIMITS.slidesMax - 1), { title: 'Your move', line: clip(ctaLine, LIMITS.slideLine) }];
    if (id === 'video') c.cta = clipWords(source.url ? 'Tap the link for the full post.' : 'Follow and save this.', 12);
    if (id === 'email' && !c.body.includes(ctaLine)) c.body = clipWords(c.body, LIMITS.emailWords - words(ctaLine) - 1) + '\n\n' + ctaLine;
  }
  return c;
}
