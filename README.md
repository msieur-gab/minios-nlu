# MiniOS NLU

A tiny, CPU-only natural language understanding model for a mini operating system running on an Orange Pi Zero 2W (Armbian). It understands an English command, picks the intent, extracts the parameters, and a small dialogue manager decides what to do and what to answer.

Inspired by Snips NLU: no deep learning, no network, deterministic at runtime.

- **Intent:** TF-IDF features (words, word pairs, character 3–4-grams) and a logistic regression.
- **Slots:** a linear-chain CRF tagger (BIO labels).
- **Training:** plain JavaScript, no dependencies (`web/trainer.js`). The same file trains in Node (`node train.js`) and in the browser, so the PWA can retrain itself on the phone. Weak weights are dropped and the rest stored as 1-byte numbers: 358 KB for 22 skills.
- **Skills as folders:** every skill is `skills/<name>/`: a `skill.md` in plain Markdown (example sentences, the values it knows, the API request it makes, what it says) and, only where needed, a short `skill.js`. They are also the training data: `node skills.js` turns the examples into sentences. `web/agent.js` is the dialogue only (questions, confirmations, choices, several commands per sentence) and knows no skill by name; `web/services.js` holds what skills share (dates in words, folders, network, memory). See `skills/README.md`.
- **Real APIs:** weather and the time in other places come from Open-Meteo (free, no key). Only the place name and its coordinates are sent; your name and place are stored on the device only.
- **Inbox:** every sentence the agent can't handle lands in an inbox on the device (plus any reply you flag as wrong). For each one: add it to an existing skill (tap words, then pick which of the skill's declared values they are), make a new skill from it with the answer it should give, or mark it "not for me". Retrain on the phone, keep the trained model across reloads, and export what was taught: training lines for existing skills, and a draft `skills/<name>/skill.md` for each new skill, ready to commit.
- **Runtime:** dependency-free Python (`nlu/`, for the Pi) and plain JavaScript, both reading the same exported `model.json`. `python evaluate.py` checks the Python side against the test set.
- **Dates, times, durations:** a rule-based parser (`web/entities.js`), not part of the model. It reads "next friday at 3pm", "in 2 days", "next year", "timer 1h30", "every weekday at 8" and flags what is ambiguous ("next friday" on a Monday, "at 9", "3/4") or already past, so the agent asks instead of guessing. Every skill that needs time shares it; adding one needs no retraining of this layer.
- **Dialogue:** asks for missing slots, confirms risky actions (power), offers a choice when a date or time is ambiguous, abstains below a confidence threshold, and falls back on small dictionaries (apps, directions, metrics) when the model is unsure.

Try it: the `docs/` folder is a Progressive Web App that runs the model fully offline. Commands are simulated: the trace shows the shell command that would run on the device.

## Intents

| intent | slots |
|---|---|
| `create_folder` | name, location |
| `create_file` | name, file_type, location |
| `open_file` | name, location |
| `open_app` | app |
| `adjust_volume` | direction, level |
| `adjust_brightness` | direction, level |
| `system_status` | metric |
| `power` | power_action |
| `get_time` | place (optional) |
| `get_date` | none (date read by the parser) |
| `set_timer` | none (duration read by the parser) |
| `set_reminder` | task (when read by the parser) |
| `get_weather` | place (optional; day read by the parser) |
| `remember_me` | name, place |
| `recall_me`, `forget_me` | none |
| `greet`, `thanks`, `help`, `affirm`, `deny`, `out_of_scope` | none |

## Layout

```
data/
  synth_*.md            externally generated batches, cleaned
  synth_moved.md        time requests that were labelled out_of_scope before the time skills
  test.md               handwritten held-out set
  skills.md             generated from skills/ (don't edit)
nlu/
  features.py           tokenizer and features (mirrored in web/runtime.js)
  dataset.py            annotated Markdown parser
  runtime.py            dependency-free inference (the Pi side)
skills/                 one folder per skill: skill.md + optional skill.js (see skills/README.md)
web/
  runtime.js            JS inference, same model.json
  trainer.js            JS training: TF-IDF + logistic regression (L-BFGS), CRF, pruning, export
  inbox.js              inbox storage, triage decisions, Markdown export (on the device)
  entities.js           rule-based dates, times, durations, recurrences
  agent.js              dialogue: routes to skills, questions, confirmations, choices, sequences
  services.js           shared services for skills: dates in words, folders, network, memory
  template.html         the page; build_web.py fills in model, code and data
pwa/                    PWA assets (manifest, icons, service worker template)
docs/                   built PWA, served by GitHub Pages
models/model.json       exported model (with its held-out scores)
tests/                  recorded API answers, expected dialogue transcript
```

## Data format

```
## intent: create_folder
- make a folder called [reports](name) in [documents](location)
```

## Commands

```
node train.js                    # compile the skills, train the shipped model, print held-out scores
python build_web.py              # build the PWA in docs/ (standard library only)
TZ=Europe/Berlin node test_entities.js   # date/time parser against fixed phrases
TZ=Europe/Berlin node test_dialogue.js   # replay scripted conversations; fails if a reply changed
                                         # (--update accepts the new replies, -v prints them)
python evaluate.py               # the Python runtime (Pi side) against the test set
```

Training takes about a minute on a laptop, in Node or in the browser (training files are listed in `data/manifest.json`). Inference runs in well under a millisecond per sentence.

Held-out, on the 144 handwritten test sentences that appear in no training file: intent accuracy 97.2%, slot F1 0.96.

The scikit-learn reference trainer, the dataset cleaning and cross-validation scripts and the raw generated batches were removed on 13 October 2026; they are in the git history before that date.
