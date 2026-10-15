# Lexicon

Words that mean the same thing **in every skill**. Each line is a family: the first word names
it, and the model reads the others as that word. Examples that teach one word of a family teach
all of them, so a new synonym works by adding it here, without new example lines and without
retraining. The slot tagger still sees the words as written.

Rules (`node skills.js` checks the first two):
- one word, lowercase; a word belongs to one family only
- the first word should appear in some example, or the family teaches nothing (`node train.js`
  warns)
- add words the examples lack, not words they already teach well: a family replaces the word,
  and its context goes with it ("hi, my name is…" lost confidence when "hi" read as "hello")
- a word that means different things in different skills stays out: "text" (a text file, or
  "text me"), "note", "show", "notify", "wake", "start", "turn", "drop", "wipe". Examples teach
  those, in the skill where each meaning lives.

## Families
- phone: mobile, cellphone, smartphone, cell
- rain: rainy, raining, drizzle, showers, downpour, precipitation
- snow: snowy, snowing, sleet
- sunny: sunshine
- cold: chilly, freezing, frosty
- hot: warm, boiling
- loud: noisy, deafening, blaring
- mute: silence, silent
- bright: blinding, glaring
- dim: dimmer
- remember: memorize, memorise
- folder: subfolder
- yes: yeah, yep, yup, aye, affirmative
- no: nope, nah, negative
- hello: howdy, hiya, greetings
- thanks: thank, cheers, appreciated
