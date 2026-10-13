# Handoff — 13 October 2026

Where the MiniOS agent stands, and what's open. Everything below is on `main` and live on
GitHub Pages.

## Where things are

- **Model:** TF-IDF + logistic regression (intent) and a CRF (slots), trained by plain
  JavaScript (`web/trainer.js`), in Node or on the phone. 358 KB for 22 skills, 5,863 training
  sentences (2,887 from skill files). Held-out: intent 97.2% and slot F1 0.96 on the 144 test
  sentences that appear nowhere in training (97.7% on all 177; 33 of them are also in training).
  Not retrained on 13 October: training data unchanged.
- **Skills:** one folder per skill, `skill.md` plus an optional `skill.js`. Since 13 October
  every `skill.md` also declares:
  - `## Slots`: each value's type (`text`, `place`, `datetime`, `duration`, `list <values>`),
    whether it's `required`, the `ask:` and `invalid:` replies, `default: home`, and for lists
    `guess` (find the list's words anywhere in the sentence) and `ignore:` words.
  - `confidence:` per skill. Between the global 0.45 and this, the agent asks first.
  - `uses: network`: offline or failed call → "I need a network connection to …".
  - `role: yes / no / fallback` for affirm, deny and out_of_scope.
  Format guide: `skills/README.md`.
- **Compile checks:** `node skills.js` stops with file and reason on an unknown slot type, a
  required slot without an `ask:` reply, a missing reply, a `[..](slot)` or `{slot}` in a
  command that isn't declared, a list slot without its list, a duplicated role.
- **Core:** `web/agent.js` (382 lines) is the dialogue: routing, slot filling and asking,
  confirm, choose, handover, several commands per sentence. It knows no skill by name or
  vocabulary. `web/services.js` holds shared services.
- **Date parser:** `web/entities.js`, rule-based, 99/99 tests.
- **Inbox:** unknown sentences saved on the phone; triage, retrain on the device, export `.md`.
  Adding to an existing skill offers only the values its `skill.md` declares (as buttons; dates
  and durations aren't marked). A new skill gets an answer ("OK, alarm at {time}") and works
  on the phone straight after retraining, asking "Which time?" when a value it uses is missing.
  The export holds training lines for existing skills and a draft `skills/<name>/skill.md` per
  new skill that passes the compile checks.
- **APIs:** weather and world time via Open-Meteo (no key). Name and home place on the device.

Run: `node train.js` (compiles the skills too), `python build_web.py`,
`TZ=Europe/Berlin node test_entities.js`, `TZ=Europe/Berlin node test_dialogue.js`.

## Decided on 13 October

- **Skills declare their values, questions and answers.** The core fills slots and asks; a
  script asks by itself only for "one or the other" rules (file or folder, level or direction,
  a time that becomes a reminder).
- **Network:** the agent says it needs the network; it doesn't silently disable a skill.
  Declare `uses: network` only when a skill can answer nothing offline (get_time stays without
  it: it still gives the local time).
- **Runtimes:** browser JS on web and mobile (no Node), Python on the Pi (preinstalled). The
  `skill.md` files are shared; the small parser would exist once per runtime. No Pyodide. A
  connector between the two is for later.
- **Code size, honestly:** scripts 370 → 346 lines, core 321 → 382, compiler 131 → 178 (about
  30 of them checks). About 85 lines more overall; the gain is one place for slot filling and
  skill files that describe their whole behaviour.
- **What the model is:** it recognises unseen sentences through words, word pairs and word
  fragments it has met, not meaning. Sentences built on words no example used for a skill
  ("precipitation") are abstained on. Examples should teach vocabulary, not volume.

## Open

**Not yet tested in real life**
- Everything merged on 13 October, on the phone (grey-zone question, invalid answers, offline
  message, list words like "it's too loud", "rebot the pi").
- Open-Meteo calls from the phone; the browser's offline signal (`navigator.onLine`).
- On-device retraining time on the phone, memory use on the Pi Zero 2W (512 MB).

**Next for the model, in this order (13 October)**
1. **Test set:** about a dozen fresh, handwritten sentences per skill (now 3–9 for most;
   greet 3, power 6, reminders 8). It's the measure for everything below.
2. **Vocabulary:** example lines that introduce the words people use, and contrasting lines
   at the edges between skills ("remind me what day it is" → date, "time to go home" → out of
   scope).
3. **Slot boundaries:** 5 of the 9 test errors are values cut short or missed ("folder for
   bike repairs", "a note named ideas for pebbble" → "ideas", "please lower the volume").
4. **Typos in the rule-based parts:** the model copes ("creat a foldr", "set a timr"); value
   lists ("opne the termnal", "dowload") and date words ("tomorow") don't. Fuzzy matching once,
   in the list slot type and the date parser.

**Also open (from 12 October)**
- **Place disambiguation:** name the country, ask between places, remember the choice.
- **Browser capabilities as skills:** speech output, notifications, location for "weather
  here". Avoid browser speech input in Chrome.
- **Small context across tasks:** "and tomorrow?" after the weather, "open it" after creating
  a folder. A follow-up could reuse the previous skill's filled slots.
- **Split the brains** (OS brain for the Pi vs. weather/memory) and an **executor on the Pi**
  (only declared commands; values from lists).
- **Device skills:** a `uses: device` for skills that need the Pi's `/sys` and `/proc`
  (system status), answered as unavailable in the browser.

**Known gaps**
- Names containing "and" ("a folder called salt and pepper" → "salt").
- Date parser: "after lunch", "mid-november", languages other than English.
- Python reference tools (`lint.py`, `cv.py`) not rerun since the skill-file migration;
  `DATASET_BRIEF.md` predates skill files.

## Branches

All merged into `main` (fast-forward), kept for history: `time-skills`, `js-trainer`, `inbox`,
`skill-files`, `multi-intent`, `core-split`, `place-names`, `dates`, `typed-slots`.
