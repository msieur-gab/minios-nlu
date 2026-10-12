# MiniOS NLU

A tiny, CPU-only natural language understanding model for a mini operating system running on an Orange Pi Zero 2W (Armbian). It understands an English command, picks the intent, extracts the parameters, and a small dialogue manager decides what to do and what to answer.

Inspired by Snips NLU: no deep learning, no network, deterministic at runtime.

- **Intent:** TF-IDF features (words, word pairs, character 3–4-grams) and a logistic regression.
- **Slots:** a linear-chain CRF tagger (BIO labels).
- **Training:** plain JavaScript, no dependencies (`web/trainer.js`). The same file trains in Node (`node train.js`) and in the browser, so the PWA can retrain itself on the phone. Weak weights are dropped and the rest stored as 1-byte numbers: 317 KB instead of 1,234 KB, with the same held-out accuracy.
- **Skills as folders:** `skills/<name>/skill.md` describes a skill in plain Markdown: example sentences, the values it knows, the API request it makes, and what it says. A `skill.js` next to it holds logic the Markdown can't express. `agent.js` keeps only the dialogue and the shared services skills use (date parser, place lookup, memory, network, command executor). See `skills/README.md`. Moved so far (pilot): open_app, set_timer, get_time; new: get_weather, remember_me, recall_me, forget_me.
- **Real APIs:** weather and the time in other places come from Open-Meteo (free, no key). Only the place name and its coordinates are sent; your name and place are stored on the device only.
- **Inbox:** every sentence the agent can't handle lands in an inbox on the device (plus any reply you flag as wrong). For each one: add it to an existing skill (tap words to mark values), make a new skill from it, or mark it "not for me". Retrain on the phone, keep the trained model across reloads, and export what was taught as a `.md` training file to commit here. A new skill is recognised straight away but answers that no action is set up yet, until a handler exists in `agent.js`.
- **Runtime:** dependency-free Python and plain JavaScript, both reading the same exported `model.json`.
- **Reference:** `train.py` still trains the same models with scikit-learn into `models/model_sklearn.json`, for comparison.
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
  train.md              template-generated seed (seed_data.py)
  synth_*.md            externally generated batches, cleaned
  synth_moved.md        time requests that were labelled out_of_scope before the time skills
  test.md               handwritten held-out set
  raw/                  batches as received, plus the cleaning log
nlu/
  features.py           tokenizer and features (mirrored in web/runtime.js)
  dataset.py            annotated Markdown parser
  runtime.py            dependency-free inference
web/
  runtime.js            JS inference, same model.json
  trainer.js            JS training: TF-IDF + logistic regression (L-BFGS), CRF, pruning, export
  inbox.js              inbox storage, triage decisions, Markdown export (on the device)
  entities.js           rule-based dates, times, durations, recurrences
  agent.js              dialogue manager and response templates
  template.html         test page
pwa/                    PWA assets (manifest, icons, service worker template)
docs/                   built PWA, served by GitHub Pages
models/model.json       exported model
DATASET_BRIEF.md        brief given to the model that generates training data
```

## Data format

```
## intent: create_folder
- make a folder called [reports](name) in [documents](location)
```

## Commands

```
pip install -r requirements-train.txt   # only for the Python reference tools
python seed_data.py              # regenerate the template seed
python clean_batches.py          # clean raw external batches into data/synth_*.md
python lint.py data/raw/x.md     # duplicates, conflicts, structure diversity
node skills.js                   # compile the skill folders (train.js also does it)
node train.js                    # train the shipped model (no dependencies), print held-out scores
python train.py                  # optional reference: scikit-learn → models/model_sklearn.json
python evaluate.py               # held-out metrics and error list
python cv.py data/synth_x.md     # 5-fold before/after for a new dataset
python build_web.py              # build web/index.html and the PWA in docs/
node test_entities.js            # date/time parser against fixed phrases (TZ=Europe/Berlin)
node test_dialogue.js            # scripted conversations through model + agent, fixed clock, recorded API answers
```

Training takes about 20 seconds on a laptop, in Node or in the browser (training files are listed in `data/manifest.json`). Inference runs in well under a millisecond per sentence.

| | size | intent accuracy | slot F1 |
|---|---|---|---|
| scikit-learn reference | 1,234 KB | 95.5% | 0.97 |
| JavaScript trainer, pruned | 317 KB | 96.2% | 0.97 |

(held-out set of 157 handwritten sentences; the page shows the 124 that never appear in training)
