# Skills

One folder per skill. Everything a skill is lives in its folder:

```
skills/get_weather/
  skill.md    what it understands, the values it knows, the API it calls, what it says
  skill.js    optional: logic the Markdown can't express (here: picking the forecast day)
```

`node skills.js` reads every folder and writes `data/skills.md` (training sentences) and
`web/skills.json` (what the agent uses at runtime). `node train.js` runs it first, and
`python build_web.py` bundles the scripts into the page. Edit the skill folders, never
the generated files.

Delete a folder and the skill is gone. Copy a folder and you have a new skill to edit
(rename `skill:` to match the new folder name).

## skill.md

```markdown
---
skill: get_weather       # must match the folder name
help: check the weather (“weather tomorrow”)   # one line for the help answer
samples: 8               # sentences generated per example line (default 6)
train_only: city, day    # value lists used only to write examples
---
# Title

Free text: what the skill does, what it sends where, anything a person should know.

## Examples
- what's the weather {like |}in [{city}](place) {day}

## Values: city
- Munich
- Paris

## Request
GET https://api.open-meteo.com/v1/forecast
- latitude: {place.lat}
- longitude: {place.lon}
- current: temperature_2m,weather_code

## Answer
- temp: current.temperature_2m round
- sky: current.weather_code → sky

## Replies
- checking: Checking the weather for {place}…
- done: {place}: {sky}, {temp}°C.
```

## Slots, confidence, network

```markdown
---
skill: set_reminder
confidence: 0.7      # below this (but above the global 0.45), ask “Do you want…?” first
uses: network        # only for skills that can't answer anything offline (get_weather)
---
## Slots
- task: text
- when: datetime, required, ask: ask_when, invalid: when_invalid
- place: place, required, ask: ask_place, default: home
```

**Slots.** The values a skill works with, declared once. The agent fills them before the
script runs, so `skill.js` gets `ctx.slots.when` ready to use and never asks by itself.

| type | value |
|---|---|
| `text` | the words the model marked |
| `place` | the place named, whole (“hong kong”) |
| `datetime` | a date, time, range or repeat from the date parser |
| `duration` | a duration from the date parser (“10 minutes”, “1h30”) |
| `list app` | an entry of `## Values: app`; the script gets the whole entry (`.key`, `.out`) |

| option | |
|---|---|
| `required` | if it's missing, ask with the `ask:` reply; the answer comes back to this skill |
| `invalid: reply` | asked instead when an answer doesn't fit the type (“banana” for a time) |
| `default: home` | the place the person told the agent they live in |
| `guess` | list slots: when the model marked nothing, look for the list's words in the whole sentence (“it's too loud” → down) |
| `ignore: app window` | list slots: words dropped from the end before matching (“the terminal app”) |

A list slot's `ask:` and `invalid:` replies can use `{choices}` (the list's names) and `{value}`
(what was said). The words the model marked, before filling, are in `ctx.raw`.

A script still asks by itself only when the rule isn't one slot: a file *or* a folder
(open_file), a level *or* a direction (volume), a time that should become a reminder (timer).

**confidence.** How sure the model must be to act straight away. Between the global
threshold and this, the agent asks first, with the skill's `unsure` reply or a generic
“Do you want me to {help line}?”. Leave it out and the skill acts at the global threshold.

**uses: network.** When the device is offline, or the request fails, the agent answers “I
need a network connection to {help line}.” A skill's own `offline` reply still wins (get_time
uses it to give the local time anyway).

**Checked when compiling.** `node skills.js` stops with the file and the reason when a slot
has an unknown type, a required slot has no `ask:` reply, a reply named in a slot doesn't
exist, the examples mark a `[...](slot)` the Slots section doesn't declare, a `command:` uses
an undeclared `{slot}`, or a list slot names a list that doesn't exist.

**Examples.** Each line is a template.
- `{a|b|}` picks an alternative; an empty one makes it optional.
- `{list}` picks a value from `## Values: list`.
- `[...](slot)` marks the words the model should pull out.

**Values.** `key: other, words → output`. People say the words; the output is what the
skill uses (a command, a description…).

**Request.** The API call, all of it: method and URL, then one line per query parameter.
`{slot}` inserts a value from the sentence. `{place.lat}`, `{place.lon}` and
`{place.timezone}` make the agent look the place up first.

**Answer.** Which fields of the response become reply values: a path into the JSON,
`round` for whole numbers, `→ list` to translate a code through a values list.

**Replies.** `name: variant | variant`, one picked at random, `{value}` filled in.

A skill with a Request and no script simply replies `checking`, then `done` (or
`not_found` if the place doesn't exist). That is enough for many API skills.

## Running a command instead

```markdown
---
skill: open_app
action: run
command: "{app} &"
---
## Slots
- app: list app, required, guess, ask: ask_app, invalid: unknown, ignore: app application program window

## Values: app
- terminal: console, shell → x-terminal-emulator
```

`run` fills each `{slot}` in the command with its value's output and hands it to the
device's executor (simulated in the PWA), then answers with the `done` reply. Only values
from the list can be used, so a sentence can't inject a command.

## Other front matter

| key | |
|---|---|
| `role: yes` / `no` / `fallback` | the skills the dialogue relies on: yes and no to its questions, and “I can't do that” |
| `kind: chat` | conversational (greet, thanks, yes, no…): never split out of a sentence as a command |
| `action: say` | no script: answer with the `say` reply |
| `script: adjust_volume` | use another skill's skill.js (Brightness reuses Volume's, with its own commands) |
| `lowercase: 0.35` | share of generated sentences also added in lowercase |
| anything else | free parameters the script reads from `ctx.params` (commands, a start level…) |

## skill.js

Only when the Markdown isn't enough. It exports one function that gets a toolbox:

```js
module.exports = {
  run(ctx) {
    if (!ctx.slots.place) return ctx.ask("place", "ask_place");     // ask for what's missing
    return ctx.later("checking", { place: ctx.slots.place }, async () => {
      const r = await ctx.request({ place: ctx.slots.place });       // the Request in skill.md
      return ctx.say("done", { place: r.place.name, ...r.answer });
    });
  },
};
```

| ctx | |
|---|---|
| **answering** | |
| `say(reply, values)` | a reply from this skill's file |
| `ask(slot, reply)` | ask for a missing value; the answer comes back to this skill |
| `confirm(what, question, then)` | needs a yes first; `then(ctx)` runs after it |
| `choose(question, options)` | offer options `{ label, keys, then }`; the answer picks one |
| `later(reply, values, async work)` | answer now, update the reply when the work is done |
| `handover(skill, slots, prefix)` | let another skill answer ("timer for 3pm" → set_reminder) |
| **reading** | |
| `slots`, `raw`, `text`, `now`, `params` | the filled slots, the words the model marked, the sentence, the time, the front matter |
| `entities()` | dates, times and durations from the date parser |
| `find(list, words)`, `findIn(skill, list, words)`, `lookup(list, key)` | match words against a value list; a value's output |
| **services** | |
| `request(values)` | the call declared under `## Request` → `{ answer, json, place }` |
| `geocode(name)` | a place's coordinates and time zone |
| `me.get()`, `me.set()` | what the agent remembers about the person, on the device |
| `state.get(key, start)`, `state.set(key, value)` | a value kept for the session (the volume level…) |
| `files.where(place)`, `files.quote(path)` | "documents" → `$HOME/Documents`; a path safe for the shell |
| `arm(at, message)` | ring at a time (in the PWA, while the page is open) |
| `skills()` | every skill's help line |
| `fmt.*` | dates and times in words (`dayText`, `whenText`, `durWords`, `ruleWords`…) |
| **trace** | |
| `exec(command)`, `log(text)`, `used(entity)` | a command for the executor; a note; a parsed date |

A script uses these and never reaches past them. The dialogue (web/agent.js) and the services
(web/services.js) know no skill by name.
