// Remi 💿 — a little vinyl record with a face on its label, headphones and two tiny arms.
// States (classes on the <svg>): is-spin (remixing), is-scratch (regenerate), is-bounce (published), is-slow (idle hover spin).
export function remi({ size = 120, cls = '', label = 'Remi, the Remixly mascot' } = {}) {
  return `<svg class="remi ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${label}">
  <g class="remi-body">
    <path class="remi-arm l" d="M28 80 q-11 3 -14 13" fill="none" style="stroke:var(--remi-line,#232323)" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="13.5" cy="94" r="4.2" fill="#F1EEE7" stroke="#232323" stroke-width="2.4"/>
    <g class="remi-wave"><path d="M92 78 q12 -1 15 -13" fill="none" style="stroke:var(--remi-line,#232323)" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="107.5" cy="63.5" r="4.2" fill="#F1EEE7" stroke="#232323" stroke-width="2.4"/></g>
    <g class="remi-disc">
      <circle cx="60" cy="66" r="37" fill="#232323" stroke="#F1EEE7" stroke-opacity=".38" stroke-width="1.6"/>
      <circle cx="60" cy="66" r="32" fill="none" stroke="#3b3a37" stroke-width="1.3"/>
      <circle cx="60" cy="66" r="27.5" fill="none" stroke="#3b3a37" stroke-width="1.3"/>
      <circle cx="60" cy="66" r="23" fill="none" stroke="#3b3a37" stroke-width="1.3"/>
      <path d="M33 52 a31 31 0 0 1 17 -15" fill="none" stroke="#F1EEE7" stroke-opacity=".28" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="60" cy="66" r="16.5" fill="#D6A878"/>
      <circle cx="60" cy="66" r="16.5" fill="none" stroke="#232323" stroke-opacity=".18" stroke-width="1"/>
      <ellipse class="remi-eye" cx="54.6" cy="63.6" rx="1.9" ry="2.3" fill="#232323"/>
      <ellipse class="remi-eye" cx="65.4" cy="63.6" rx="1.9" ry="2.3" fill="#232323"/>
      <path d="M54.5 69 q5.5 5 11 0" fill="none" stroke="#232323" stroke-width="1.9" stroke-linecap="round"/>
      <circle cx="51.2" cy="68.6" r="1.7" fill="#c98f5a" opacity=".7"/><circle cx="68.8" cy="68.6" r="1.7" fill="#c98f5a" opacity=".7"/>
      <circle cx="60" cy="56.8" r="1.3" fill="#F1EEE7"/>
    </g>
    <path d="M24 60 C24 22 96 22 96 60" fill="none" style="stroke:var(--remi-line,#232323)" stroke-width="5.5" stroke-linecap="round"/>
    <rect x="13" y="50" width="15" height="26" rx="6" fill="#9FB6D6" stroke="#232323" stroke-width="3"/>
    <rect x="92" y="50" width="15" height="26" rx="6" fill="#9FB6D6" stroke="#232323" stroke-width="3"/>
  </g>
</svg>`;
}

export function logo({ size = 26 } = {}) {
  return `<span class="logo">${remi({ size, cls: 'logo-remi', label: '' })}<span class="logo-word">remixly</span></span>`;
}

/** Plays a one-shot state (scratch / bounce) on every Remi inside root. */
export function remiOnce(root, state, ms = 900) {
  const els = root.querySelectorAll ? root.querySelectorAll('.remi') : [];
  els.forEach((el) => { el.classList.remove(state); void el.getBoundingClientRect(); el.classList.add(state); setTimeout(() => el.classList.remove(state), ms); });
}
