# Brief: synthetic training data for the MiniOS agent

You are generating training sentences for a small intent + slot model. It controls a mini operating system on a single-board computer: folders, files, apps, sound, screen, system status and power. English only. Write the way real people type commands: short, casual, sometimes polite, sometimes terse, occasional typos and missing words.

## Delivery (read first)

- Deliver the data as a **downloadable file** named `minios_batch_<letter>.md`. If you cannot create files, put the whole batch inside **one single fenced code block** (```` ```markdown ````) and nothing else. Never write the data as normal chat text: it gets rendered and the annotations are lost.
- Work in three batches, one file each, and wait for "next" between them:
  - **Batch A**: `create_folder`, `create_file`, `open_file`, `open_app`
  - **Batch B**: `adjust_volume`, `adjust_brightness`, `system_status`, `power`
  - **Batch C**: `greet`, `thanks`, `help`, `affirm`, `deny`, `out_of_scope`
- Before delivering, check that every line starts with `- `, every header is `## intent: <name>`, every bracket pair is `[text](slot)` with a slot name from the table, and the count per intent matches the target.

## Output format (strict)

Raw Markdown text. One header per intent, one sentence per line starting with `- `. Annotate every slot value inline as `[value](slot)`. Nothing else: no numbering, no comments, no explanations.

```
## intent: create_folder
- make a folder called [reports](name) in [documents](location)
```

## Intents and slots

Every slot is optional. Always include sentences with no slots at all.

| intent | meaning | slots |
|---|---|---|
| `create_folder` | make a new folder | `name`, `location` |
| `create_file` | make a new empty file | `name`, `file_type`, `location` |
| `open_file` | open an existing file or folder | `name`, `location` |
| `open_app` | open an application | `app` |
| `adjust_volume` | change the sound volume, mute, unmute | `direction`, `level` |
| `adjust_brightness` | change the screen brightness | `direction`, `level` |
| `system_status` | ask about disk, CPU, temperature, memory, network, uptime, or overall health | `metric` |
| `power` | shut down, restart or put the device to sleep | `power_action` |
| `greet` | hello | none |
| `thanks` | thank you | none |
| `help` | asks what the agent can do | none |
| `affirm` | yes / ok / go ahead | none |
| `deny` | no / cancel / never mind | none |
| `out_of_scope` | anything else | none |

## Annotation rules

- `name`: the file or folder name only, without "called", "named", "the", "file" or "folder", and without quotes. Quotes stay outside the brackets: `called "[Old Projects](name)"`. Names may be several words: `[trip to kyoto](name)`.
- A file name with its extension is one `name` span: `[notes.md](name)`. If the sentence also names the type, tag it too: `a [yaml](file_type) file named [config.yaml](name)`.
- `file_type`: the type word only: `[markdown](file_type) file`, `a [python](file_type) script`. Values: markdown, md, text, txt, plain text, python, json, html, csv, yaml, javascript, css.
- `location`: the folder name only, without "in", "the", "my" or "folder": `in the [projects](location) folder`, `on my [desktop](location)`. Deictic folders count: `in the [current folder](location)`, `in [this directory](location)`. The bare word "here" is not tagged: `create folder [x](name) here`.
- `open_file` vs `location`: the thing being opened is `name`; where it lives is `location`. `open [budget.csv](name) from [downloads](location)`, `open the [invoices](name) folder on my [desktop](location)`. When the sentence only opens a standard place, tag it as location: `open my [documents](location) folder`.
- `app`: the app name only: `open the [web browser](app)`. Values: terminal, console, shell, command line, browser, web browser, firefox, chromium, file manager, files, file explorer, text editor, editor, notepad, calculator, settings.
- `direction`: the single word that carries the direction: `turn the volume [up](direction)`, `[increase](direction) the brightness`, `make it [louder](direction)`, `[dim](direction) the screen`, `[mute](direction)`, `[unmute](direction)`. Do not tag indirect phrasings like "it's too loud" or "I can't see the screen": leave them unannotated.
- `level`: the target amount: `volume to [40%](level)`, `brightness [60 percent](level)`, `volume [max](level)`, `[half](level) brightness`.
- `metric`: what is being asked about: `[disk space](metric)`, `[cpu](metric)`, `[temperature](metric)`, `[ram](metric)`, `[ip address](metric)`, `[uptime](metric)`, `[performance](metric)`. Leave general questions ("how's the system doing?", "is the pi overheating?") unannotated.
- `power_action`: the action words: `[shut down](power_action) the pi`, `[restart](power_action)`, `put it to [sleep](power_action)`, `[power off](power_action)`.
- "Turn it up" or "turn it down" with no object means volume.

## What to produce

- `create_folder`, `create_file`, `open_file`, `open_app`: 250 sentences each.
- `adjust_volume`, `adjust_brightness`, `system_status`, `power`: 150 each.
- `greet`, `thanks`, `help`, `affirm`, `deny`: 40 each.
- `out_of_scope`: 400.

## Diversity rules (hard limits)

- No exact duplicates, ever.
- No sentence structure may appear more than 5 times. Changing only the slot values does not make a new structure: "open X from Y" with 100 different files is one structure.
- Do not generate sets of three variants of the same sentence ("create folder X / make folder X / new dir X"). Each sentence must be written on its own.
- Per intent, at least: 20% questions ("could you…", "can I get…"), 15% indirect or complaining phrasings ("it's too loud", "where's my budget file, open it"), 10% with a realistic typo or a missing word, 10% with the slot before the verb.
- Write what a person would really type. Avoid unnatural word orders such as "file create" or "new file make".
- Never pad to reach a count. Fewer sentences are better than filler; stop when you run out of real ones.
- A sentence must belong to exactly one intent. Never put the same sentence (e.g. "raise it a little") under two intents.
- In "typo" variants, change spelling only, never the meaning: a typo of "file" must not become "folder".
- About a third of the names should be several words without quotes: `called [tax returns 2024](name) in [documents](location)`.

## Variety

- Use many different verbs and structures: imperative, questions ("could you…"), wishes ("I need…"), complaints ("it's too loud", "the screen is too dark"), fragments ("folder named x pls", "volume 30"), slot first ("in documents, make a folder called x").
- Invent many different names: single words, several words, with hyphens, underscores, digits, capitals, project-like and everyday names. Never reuse the same name more than 3 times.
- Put long multi-word names in quotes about a third of the time, and leave them unquoted the rest of the time.
- Vary locations: documents, desktop, downloads, pictures, music, home, and invented folder names.
- For `out_of_scope`, about half must be near misses that mention the same words but must NOT trigger an action:
  - other file actions: delete, remove, rename, move, copy, close, search, list, change directory, zip;
  - other devices or toggles: "turn off the wifi", "turn off bluetooth", "shut the door", "open the window";
  - questions about concepts: "what does reboot mean", "what is a markdown file", "how much RAM do I need for gaming";
  - the same words in another sense: "the volume of a box", "the temperature in Paris", "my laptop has no space";
  - the rest is unrelated chat, requests for other apps or services (email, music player, calendar, timers), and nonsense.
- No duplicates. No sentence longer than 20 words.
