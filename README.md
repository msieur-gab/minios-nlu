# MiniOS NLU

A tiny, CPU-only natural language understanding model for a mini operating system running on an Orange Pi Zero 2W (Armbian). It understands an English command, picks the intent, extracts the parameters, and a small dialogue manager decides what to do and what to answer.

Inspired by Snips NLU: no deep learning, no network, deterministic at runtime.

- **Intent:** TF-IDF features (words, word pairs, character 3–4-grams) and a logistic regression.
- **Slots:** a linear-chain CRF tagger (BIO labels).
- **Runtime:** dependency-free Python and plain JavaScript, both reading the same exported `model.json`. Parity with scikit-learn is checked at every training run.
- **Dialogue:** asks for missing slots, confirms risky actions (power), abstains below a confidence threshold, and falls back on small dictionaries (apps, directions, metrics) when the model is unsure.

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
| `greet`, `thanks`, `help`, `affirm`, `deny`, `out_of_scope` | none |

## Layout

```
data/
  train.md              template-generated seed (seed_data.py)
  synth_*.md            externally generated batches, cleaned
  test.md               handwritten held-out set
  raw/                  batches as received, plus the cleaning log
nlu/
  features.py           tokenizer and features (mirrored in web/runtime.js)
  dataset.py            annotated Markdown parser
  runtime.py            dependency-free inference
web/
  runtime.js            JS inference, same model.json
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
pip install -r requirements-train.txt
python seed_data.py              # regenerate the template seed
python clean_batches.py          # clean raw external batches into data/synth_*.md
python lint.py data/raw/x.md     # duplicates, conflicts, structure diversity
python train.py                  # train, export models/model.json, check parity
python evaluate.py               # held-out metrics and error list
python cv.py data/synth_x.md     # 5-fold before/after for a new dataset
python build_web.py              # build web/index.html and the PWA in docs/
```

Training takes a few seconds on a laptop. Inference runs in well under a millisecond per sentence.
