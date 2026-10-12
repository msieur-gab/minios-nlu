# Skill files

One Markdown file per skill. `node skills.js` reads them all and writes:

- `data/skills.md`: training sentences, picked up by both trainers (listed in `data/manifest.json`)
- `web/skills.json`: what the agent uses at runtime (action, parameters, value lists, replies)

Edit the skill files, never the generated ones. Then `node train.js` (it recompiles the
skills first) and `python build_web.py`.

## Layout

```markdown
---
skill: open_app          # the intent name
action: run              # what the agent does (see Action types)
command: "{app} &"       # parameters for that action
needs: app               # run: the value it can't do without
samples: 16              # sentences generated per example line (default 6)
train_only: dur          # value lists used only to write examples, not shipped to the agent
---
# Title

Free text: what the skill does, privacy notes, anything a person should know.

## Examples
- {open|launch|start} {the |my |}[{app}](app)
- I {need|want} a timer{ for {dur}|}

## Values: app
- terminal: console, shell, command line → x-terminal-emulator

## Replies
- done: Opening the {app}. | Starting the {app}.
- ask_app: Which app? I can open the {choices}.
```

**Examples.** Each line is a template.
- `{a|b|}` picks one alternative; an empty one makes it optional.
- `{list}` picks a value (any of its words) from `## Values: list`.
- `[...](slot)` marks the words the model should pull out as a slot value.

Each template produces up to `samples` different sentences.

**Values.** `key: other, words → output`. The words are what people say. The output is
what the action uses: a command, a description, and so on. Both the words and the output
are optional.

**Replies.** `name: variant | variant`. One variant is picked at random. `{name}`
placeholders are filled by the action.

## Action types (in `web/agent.js`)

| action | does | parameters | replies it uses |
|---|---|---|---|
| `run` | runs `command`, filling `{value}` from the value list | `command`, `needs` | done, ask_<needs>, unknown |
| `timer` | counts down the duration in the sentence | | ask, done, ring, is_time |
| `clock` | time here, or in another place (Open-Meteo place search) | | done, elsewhere, not_found, offline |
| `weather` | current weather or forecast (Open-Meteo) | | now, day, days, checking, ask_place, not_found, too_far, past, offline |
| `memory` | remembers / says / forgets your name and place, on the device | `mode: set / get / forget` | see the remember_me, recall_me and forget_me files |

A new skill that only needs an existing action type is just a new file. A new kind of
behaviour needs a new action type in `agent.js`, which is a few dozen lines.
