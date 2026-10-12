# Handoff — 12 October 2026

Where the MiniOS agent stands after today's session, and what's open. Everything below is on
`main` and live on GitHub Pages.

## Where things are

- **Model:** TF-IDF + logistic regression (intent) and a CRF (slots), trained by plain
  JavaScript (`web/trainer.js`), in Node or on the phone. Weak weights pruned, 1-byte storage:
  358 KB for 22 skills. Held-out: intent 97.7% (177 sentences), slot F1 0.97.
- **Skills:** one folder per skill in `skills/<name>/`. `skill.md` holds the examples, value
  lists, API request, replies and help line; an optional `skill.js` holds logic Markdown can't
  express. The skill files are the training data (`node skills.js` → `data/skills.md`).
  Format guide: `skills/README.md`.
- **Core:** `web/agent.js` (320 lines) is the dialogue only: routing, missing values,
  confirm, choose, handover, several commands per sentence. It knows no skill by name.
  `web/services.js` (134) holds what skills share: dates in words, folders, network, memory.
- **Date parser:** `web/entities.js`, rule-based. 99/99 tests; beats Compromise on our
  phrases (91 vs 63 of 91), about 90× faster, 25 KB.
- **Inbox:** unknown sentences are saved on the phone; triage (add to skill, new skill, not
  for me), retrain on the device (~25–35 s on a laptop), export as `.md`.
- **APIs:** weather and world time via Open-Meteo (no key). Name and home place are stored on
  the device only.

Run: `node train.js` (compiles the skills too), `python build_web.py`,
`TZ=Europe/Berlin node test_entities.js`, `TZ=Europe/Berlin node test_dialogue.js`.

## Decided today

- **Reliability over coverage.** A confident wrong answer is worse than "I can't". Abstain,
  show what was understood, ask when it's a real choice.
- **Scope fence.** `agent.js` stays the dialogue. New behaviour becomes a skill folder or is
  refused. Direction: several small "mini-brains" (mini-OS, weather and memory…) sharing one
  core, rather than one agent doing everything.
- **Model format stays JSON** (heavy parts are binary inside it; real binary gains ~8%
  compressed).
- **"Next friday" = the coming one**, the following week offered as the alternative.
- **No Compromise dependency:** we learn from it instead.

## Open

**Not yet tested in real life**
- Open-Meteo calls from the phone (only tested against recorded answers here).
- On-device retraining time on the phone, and memory use on the Pi Zero 2W (512 MB).

**Next, in the order discussed**
1. **Place disambiguation.** Name the country in answers ("Paris, France"), ask when several
   places plausibly match, remember the choice. Started: whole multi-word names and
   "most populated" preference are in.
2. **Inbox: answers for new skills.** Ask "what should I answer?" when creating a skill in
   the inbox; store it as a `say` skill on the phone; export as a real `skills/<name>/skill.md`.
3. **Browser capabilities as skills:** speech output (offline voices), notifications for
   timers and reminders, location for "weather here". Later: wake lock, share/clipboard.
   Avoid browser speech input in Chrome (audio goes to Google).

**Later**
- **Split the brains:** the mini-OS brain for the Pi (files, apps, levels, system, power,
  timers) vs. a weather/memory brain. Not decided yet.
- **Executor on the Pi:** run declared commands for real (agent in Node on the device, or a
  small local service). Rules: only commands declared in skill files; values quoted or taken
  from lists; per-OS commands in value lists.
- **Small context for the OS brain:** "it" = the last thing created or opened; a `move_item`
  skill; typo tolerance for folder and app names ("dowload").
- **Simpler skill scripts:** weather (48 lines), reminders (74) and volume (43) carry generic
  logic (e.g. finding the asked-for day in a forecast) that a declarative section could absorb.
- **Documentation:** say in each `skill.md` where every reply placeholder comes from
  (e.g. `{list}` in help).

**Known gaps**
- Names containing "and" ("a folder called salt and pepper" → "salt").
- "remind me what day it is" → reminder; "time to go home" → time.
- Date parser: "after lunch", "mid-november" (gives the whole month), languages other than
  English.
- New skills' held-out scores are optimistic (templates were widened after first misses):
  needs a dozen fresh handwritten test sentences.
- Python reference tools (`lint.py`, `cv.py`) import fine but weren't rerun after the
  migration; `DATASET_BRIEF.md` predates skill files.

## Branches

All merged into `main` (fast-forward), kept for history: `time-skills`, `js-trainer`, `inbox`,
`skill-files`, `multi-intent`, `core-split`, `place-names`, `dates`.
