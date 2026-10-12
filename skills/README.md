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
needs: app
---
## Values: app
- terminal: console, shell → x-terminal-emulator
```

`run` fills the command with the output of the matched value and hands it to the
device's executor (simulated in the PWA). Only values from the list can be used, so a
sentence can't inject a command.

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
| `slots`, `text`, `now` | what was understood, the sentence, the time |
| `say(reply, values)` | a reply from this skill's file |
| `ask(slot, reply)` | ask for a missing value; the answer comes back to this skill |
| `later(reply, values, async work)` | answer now with a reply, update it when the work is done |
| `request(values)` | the call declared under `## Request` → `{ answer, json, place }` |
| `entities()`, `used(e)` | dates, times and durations from the parser; show one in the trace |
| `geocode(name)` | a place's coordinates and time zone |
| `me.get()`, `me.set()` | what the agent remembers about the person, on the device |
| `exec(command)`, `log(text)` | a command for the executor; a line in the trace |
| `timers.arm(at, message)`, `timers.schedule(task, when)` | ring later; set a reminder |
| `lookup(list, key)`, `fmt.*` | a value's output; date and time formatting helpers |

These are the agent's shared services. A script uses them and never reaches past them.
