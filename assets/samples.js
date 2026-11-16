// Two real sample packs (about Remixly itself), used by the homepage file browser and "Try a sample" in the app.
export const SAMPLES = {
  blog: {
    label: 'Blog post',
    source: {
      kind: 'text',
      title: 'One post, seven days: how we plan a content week',
      url: '',
      text: `One post, seven days: how we plan a content week

Most small teams write one good blog post and then stop. The post goes live, someone shares the link once, and a week later nobody remembers it. The writing was the hard part, yet it gets one day of attention.

We decided to treat every post as the start of a week instead of the end of a task. One source, six formats, seven days.

Monday is the X thread. A thread works best when the first post is a hook that stands on its own, and every next post carries one idea. We keep threads between five and eight posts, because longer threads lose readers halfway.

Tuesday is LinkedIn. The same ideas, but with a short story up front and a question at the end. LinkedIn readers give you more room, so we use it for the reasoning behind the decision, not just the result.

Wednesday is the carousel. Six to eight slides, one line each. If a point needs two lines, it is two slides. Carousels get saved, so we end on a slide worth coming back to.

Thursday goes to Telegram, where our community already is. Short, with emoji bullets, and a link back to the full post.

Friday is a 30-second video script: a hook in the first three seconds, three beats, and a call to action. We read it straight to camera with a phone.

Saturday is the email. One subject line and about a hundred words. Email is the only channel we own, so it gets the clearest call to action.

Sunday is empty on purpose. Rest is part of the plan.

The rule that makes this work is simple: no new facts. Every format only uses what is already in the post. That keeps the week consistent and keeps us honest, and it means the writing is already done before Monday starts.`,
    },
    voice: { tone: 'founder', audience: 'small teams that blog', lang: 'en', sample: '' },
    formats: {
      x: { posts: [
        'Most small teams write one good blog post… and then stop. One share, one day of attention, gone. We changed that. Every post now becomes a full week. 🧵',
        'The idea: treat every post as the start of a week, not the end of a task. One source, six formats, seven days.',
        'Monday: an X thread. First post is a hook that stands on its own. Every next post carries one idea. Five to eight posts max, because longer threads lose readers halfway.',
        'Tuesday: LinkedIn. Same ideas, short story up front, a question at the end. We use it for the reasoning behind a decision, not just the result.',
        'Wednesday: a carousel. Six to eight slides, one line each. If a point needs two lines, it is two slides.',
        'Thu → Telegram with emoji bullets. Fri → a 30s video script. Sat → the email, our only owned channel. Sun → empty on purpose.',
        'The rule that makes it work: no new facts. Every format only uses what is already in the post. The writing is done before Monday starts.',
      ] },
      linkedin: { text: `We used to write one good blog post, share the link once, and move on.

A week later nobody remembered it. The writing was the hard part, yet it got one day of attention.

So we changed the rule: every post is the start of a week, not the end of a task.

One source. Six formats. Seven days.

→ Monday: an X thread, five to eight posts, one idea each
→ Tuesday: LinkedIn, with the reasoning behind the decision
→ Wednesday: a carousel, one line per slide
→ Thursday: Telegram, where our community already is
→ Friday: a 30-second video script
→ Saturday: the email, the only channel we own
→ Sunday: empty on purpose

The rule that makes it work: no new facts. Every format only uses what is already in the post. It keeps the week consistent, and it keeps us honest.

How many days does your best post get?` },
      telegram: { text: `📣 One post, seven days: how we plan a content week

🧵 Mon: X thread, 5–8 posts, one idea each
💼 Tue: LinkedIn, the story behind the decision
🖼 Wed: carousel, one line per slide
🎬 Fri: 30-second video script
✉️ Sat: email, our only owned channel
😴 Sun: rest, on purpose

The rule: no new facts. Every format only uses what's already in the post.

👉 Read the full post on the blog` },
      carousel: { slides: [
        { title: 'One post. Seven days.', line: 'How we turn every blog post into a full content week.' },
        { title: 'The problem', line: 'One share, one day of attention, then the post is forgotten.' },
        { title: 'Mon: the thread', line: 'A hook that stands alone, then one idea per post. 5–8 posts.' },
        { title: 'Tue: LinkedIn', line: 'Short story up front, the reasoning in the middle, a question at the end.' },
        { title: 'Wed: this carousel', line: 'One line per slide. Two lines? Make it two slides.' },
        { title: 'Thu–Sat', line: 'Telegram for the community, a 30s video, then the email.' },
        { title: 'Sunday is empty', line: 'On purpose. Rest is part of the plan.' },
        { title: 'The one rule', line: 'No new facts. Every format only uses what is in the post. Save this.' },
      ] },
      video: { hook: 'Your best blog post gets one day of attention. Ours get seven.', beats: [
        { at: '3–10s', line: 'We treat every post as the start of a week, not the end of a task.' },
        { at: '10–17s', line: 'Monday a thread, Tuesday LinkedIn, Wednesday a carousel, then Telegram, video and email.' },
        { at: '17–25s', line: 'One rule: no new facts. Every format only uses what is already in the post.' },
      ], cta: 'Follow for the full week plan.' },
      email: { subject: 'One post, seven days', body: `Hi there,

Most small teams write one good post and share it once. We now give every post a full week: a thread on Monday, LinkedIn on Tuesday, a carousel on Wednesday, Telegram on Thursday, a short video on Friday and this email on Saturday. Sunday stays empty on purpose.

The rule that makes it work: no new facts. Every format only uses what is already in the post.

Read the full post and steal the plan.` },
    },
  },
  update: {
    label: 'Product update',
    source: {
      kind: 'text',
      title: 'Remixly now writes in Thai and Bahasa Indonesia',
      url: '',
      text: `Remixly now writes in Thai and Bahasa Indonesia

Starting today, every Remixly pack can be written in English, Bahasa Indonesia or Thai. Pick the language in the Voice step, before you remix.

Many BOT Chain builders write for communities in Southeast Asia. Until now they had to remix in English and then translate each post by hand, which took longer than writing them.

The language setting applies to all six formats at once: the X thread, the LinkedIn post, the Telegram announcement, the carousel slides, the 30-second video script and the email.

Platform limits still apply. Thai posts are checked against the same 280-character limit on X, and the counters in the editor count Thai characters correctly.

The source can be in any of the three languages. You can paste an English blog post and get a Thai pack back, or the other way around.

The same rule applies in every language: Remixly only uses facts from your source. It will not invent numbers or quotes, in any language.

Your packs are still recorded on BOT Chain when you publish, and the pack page shows every piece with copy and open buttons.`,
    },
    voice: { tone: 'friendly', audience: 'BOT Chain builders', lang: 'en', sample: '' },
    formats: {
      x: { posts: [
        'Remixly now writes in Thai and Bahasa Indonesia 🇹🇭🇮🇩 Pick a language in the Voice step, and your whole pack comes back in it.',
        'Why: many BOT Chain builders write for communities in Southeast Asia. Until now that meant remixing in English and translating each post by hand.',
        'One setting, all six formats: the thread, LinkedIn, Telegram, carousel slides, the 30s video script and the email.',
        'Limits still apply. Thai posts are checked against the same 280-character limit, and the counters count Thai characters correctly.',
        'Mix and match: paste an English post, get a Thai pack back. Or the other way around.',
        'Same rule in every language: only facts from your source. No invented numbers or quotes. Try it in the Voice step today.',
      ] },
      linkedin: { text: `Remixly now writes in Thai and Bahasa Indonesia.

Many BOT Chain builders write for communities in Southeast Asia. Until now, that meant remixing in English and translating every post by hand, which took longer than writing them.

Starting today, you pick the language in the Voice step. It applies to all six formats at once: the X thread, the LinkedIn post, the Telegram announcement, the carousel, the video script and the email.

A few details we cared about:
• Platform limits still apply, and the counters count Thai characters correctly
• Your source can be in any of the three languages
• The rule stays the same in every language: only facts from your source, no invented numbers or quotes

Which language should we add next?` },
      telegram: { text: `🌏 Remixly now writes in Thai and Bahasa Indonesia!

🗣 Pick the language in the Voice step
📦 It applies to all six formats at once
🔢 Thai posts still respect the 280-character limit on X
🔁 Paste English, get Thai back (or the other way around)
✅ Only facts from your source, in every language

👉 Try it in the app today` },
      carousel: { slides: [
        { title: 'Now in Thai + Bahasa', line: 'Remixly writes your whole pack in English, Bahasa Indonesia or Thai.' },
        { title: 'Why it matters', line: 'Builders writing for Southeast Asia no longer translate every post by hand.' },
        { title: 'One setting', line: 'Pick the language in the Voice step, before you remix.' },
        { title: 'All six formats', line: 'Thread, LinkedIn, Telegram, carousel, video script and email.' },
        { title: 'Limits still apply', line: 'Counters count Thai characters correctly against each platform limit.' },
        { title: 'Mix and match', line: 'Paste English, get Thai back. Or the other way around.' },
        { title: 'Try it today', line: 'Only facts from your source, in every language. Save this slide.' },
      ] },
      video: { hook: 'Remixly now speaks Thai and Bahasa Indonesia.', beats: [
        { at: '3–10s', line: 'Pick a language in the Voice step and the whole pack comes back in it.' },
        { at: '10–17s', line: 'Thread, LinkedIn, Telegram, carousel, script and email, all at once.' },
        { at: '17–25s', line: 'Paste an English post and get a Thai pack back, with real character counts.' },
      ], cta: 'Try it in the Voice step today.' },
      email: { subject: 'Remixly now writes in Thai and Bahasa Indonesia', body: `Hi there,

You can now pick English, Bahasa Indonesia or Thai in the Voice step, and every format in your pack comes back in that language: the thread, LinkedIn, Telegram, carousel, video script and email.

Platform limits still apply, and the counters count Thai characters correctly. Your source can be in any of the three languages.

As always, Remixly only uses facts from your source.

Open the app and try your next pack in a new language.` },
    },
  },
};
