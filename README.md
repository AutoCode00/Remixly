# Remixly 💿

**One piece of content in, a week of posts out.** Paste a blog, link or transcript. Remixly writes an X thread, a LinkedIn post, a Telegram announcement, an Instagram carousel (PNG slides), a 30-second video script and an email blurb, lays them on a 7-day calendar, and records the pack on BOT Chain.

*Free (gas only). No tokens, no payments, no accounts. Remixly never posts for you: every piece has Copy and Open app buttons.*

## Status

| | |
|---|---|
| Live site | _not published yet_ (GitHub Pages + custom domain) |
| PackRegistry (BOT Chain mainnet, chain ID 677) | **[`0x5cA0ba90354Bc8855b626b629E054554903611B6`](https://scan.botchain.ai/address/0x5cA0ba90354Bc8855b626b629E054554903611B6)** (deploy block 30490125). Set in `MAINNET_CONTRACT_ADDRESS` in `assets/config.js`; the footer and its **View on explorer** button use it. Not verified on the explorer yet. |
| PackRegistry (testnet, chain ID 968) | _not deployed yet_ (`TESTNET_CONTRACT_ADDRESS`, used with `?net=testnet`) |
| Worker (AI + `/upload`) | **live**: https://remixly-worker.inkprint-worker.workers.dev (Cloudflare Workers AI, free daily allowance; shared `RATE` KV, keys prefixed `remix:`). `/upload` needs a `PINATA_JWT` secret. `ALLOWED_ORIGINS` still needs your domain. |

Without a contract address (or with `?preview`), the site runs in **preview mode** and says so on screen: packs are saved in your browser, and formats come from a built-in **offline remix** (rule-based, no AI: it only rearranges sentences from your source). Reading links needs the Worker.

## What's inside

| Route | What it is |
|---|---|
| `/` | Website after the Content Architecture layout (warm paper #F1EEE7 + ink #232323 sections, Geist + Geist Mono): hero with a blog card that splits into 6 format cards and slides onto a 7-day calendar (GSAP Flip), "The next 7 days are yours." paste-a-link block, the "~6 hours lost per post" receipt that fills on scroll and collapses into "2 minutes", numbered feature grid 001–010, the real sample pack in a file-tree browser (⌘J / ⌘K), packs read from the registry, "Free, per pack.", FAQ Q.001–Q.008, the closing packs counter, and the `credits.md` footer. Lenis smooth scroll, view transitions, `prefers-reduced-motion` respected. |
| `/app` | Source (paste / link / transcript, word count, 2-line summary) → Voice (tone, audience, language, sample post) → Remix (Remi spins, cards stream in) → Edit (file tree · editor with counters · phone preview; Regenerate / Shorter / Punchier / Add CTA / Shorten) → Calendar (drag Mon–Sun, suggested schedule, Asia/Bangkok) → Publish pack. ⌘J next file, ⌘K command menu. Drafts are kept in the browser. |
| `/p/:id` | Pack page: calendar, every piece with Copy + Open app (X compose, LinkedIn share, Telegram share, email), Mark posted with the live link (small tx), "4 / 6 posted", hash check against the chain, Markdown + carousel zip downloads |
| `/app?demo=1` | The real app playing itself for 30s. The **Watch reel** modal shows it (or a recording, if `links.reel` is set). Publishing is off in the demo. |

```
index.html · 404.html (GitHub Pages SPA redirect) · deploy.html (deploy PackRegistry from MetaMask)
assets/
  config.js     ← contract addresses, deploy block, Worker URL, links (the one place to edit)
  formats.js    pure logic shared with the Worker: formats, limits, cleaning, Markdown, pack JSON, schedule, offline remix
  samples.js    the two real sample packs (Blog post / Product update)
  remi.js       Remi 💿 (SVG; spin / scratch / bounce)
  chain.js      MetaMask, BOT Chain switch/add, PackRegistry (live + preview), IPFS
  ai.js         Worker client (timeouts, per-format results)
  carousel.js   1080×1350 slide template → PNG (html-to-image) → zip (JSZip)
  main.js · home.js · app.js · pack.js · ui.js · styles.css
contracts/PackRegistry.sol
worker/         Cloudflare Worker: /remix/extract · /remix/create · /remix/tweak · /upload
tools/          compile, tests, dev server
build/          ABI + bytecode + standard JSON (for explorer verification)
```

## Contract

`contracts/PackRegistry.sol`: Solidity ^0.8.20, compiled with **solc 0.8.20 · evmVersion paris · optimizer 200 runs**, runtime ≈ 5.1 KB, no owner, no tokens.

- `publish(title, sourceHash, packHash, cid, formats) → id`: title 1–60 bytes, formats 1–10, cid ≤ 100 bytes
- `markPosted(id, formatIndex, url)`: owner only, url 1–200 bytes; stores `postedUrlHash`, emits the URL, and counts each format once in `posted` (marking again only replaces the link)
- Views: `getPack(id)`, `getPacks(from, count)`, `packsBy(addr)`, `total()`, `isPosted(id, i)`, `postsLive()` (feeds the footer)
- Events: `Published(id, owner)`, `Posted(id, formatIndex, url)`

On-chain: a title, two hashes, an IPFS cid, a format count, and the live links you add. Your source text never leaves the browser except to the AI Worker, which keeps nothing.

## Worker

```bash
cd worker && npm install
npx wrangler deploy
npx wrangler secret put PINATA_JWT
```

Set `ALLOWED_ORIGINS` in `worker/wrangler.toml` to your domain (localhost is always allowed). The default AI is **Cloudflare Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, free daily allowance, no key). For Claude, set `PROVIDER = "anthropic"` and `npx wrangler secret put ANTHROPIC_API_KEY`. Optional KV `RATE` caps each IP at 80 AI calls a day.

- `/remix/extract`: URL → readability-style main text (2 MB cap, 12 s timeout, private/local addresses refused) + a 2-line summary. Paywalled or JS-only pages return `unreadable` → the app says "Paste the text instead".
- `/remix/create`: one AI call per format, in parallel; failed formats are listed so the app retries just those. Sources over 6,000 words are condensed first (facts kept).
- `/remix/tweak`: regenerate / shorter / punchier / add CTA for one format.
- Prompt rules: only facts from the source (no invented numbers or quotes), platform limits, max 2 hashtags (also enforced in code), English / Bahasa Indonesia / Thai.
- `/upload` pins the exact pack JSON bytes, so the on-chain `packHash` matches the IPFS file.

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:4631. Add `?net=testnet` for testnet, `?preview` to force preview mode, `?offline` to force the offline remix.

## Tests

```bash
npm --prefix tools install
```
```bash
node tools/compile.mjs && node tools/test-contract.mjs && node tools/test-logic.mjs
```

## Deploy checklist

1. `node tools/compile.mjs`, serve locally, open `/deploy.html`. Deploy to **Testnet (968)** and try `/app?net=testnet`.
2. Deploy to **Mainnet (677)**. Paste the address into `MAINNET_CONTRACT_ADDRESS` (and the block into `MAINNET_DEPLOY_BLOCK`) in `assets/config.js`, and into the Status table above.
3. Verify on scan.botchain.ai. The mainnet contract was compiled with different settings from `build/` (its bytecode is 8,246 bytes vs ≈5.1 KB here, which suggests the optimizer was off), so verify with the exact compiler version, optimizer and EVM settings used to deploy it.
4. Deploy the Worker, set `PINATA_JWT`, and set `worker` in `assets/config.js`.
5. Push to GitHub, turn on Pages, add the custom domain (a `CNAME` file), and add it to `ALLOWED_ORIGINS`.
