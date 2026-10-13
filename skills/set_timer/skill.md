---
skill: set_timer
help: set timers (“timer 10 minutes”)
train_only: dur
samples: 10
---
# Timer

Counts down a duration and rings. The duration is read by the date and time parser
(web/entities.js), not by the model, so it is not marked as a slot here. If the sentence
holds a time instead ("timer for 3pm"), the timer becomes a reminder.

## Slots
- duration: duration

## Examples
- {set|start|make} a timer for {dur}{ please|}
- {set|start} a {dur} timer{ please|}
- {set|start|put} {the |a |}timer {on |}{for |to }{dur}
- timer {for |}{dur}
- {dur} timer{ please|}
- {start|begin|run} a countdown {of|for} {dur}
- countdown {for |}{dur}
- {can|could} you {set|start} a timer{ for {dur}|}{?|}
- {set|start} a timer{ please|}
- time {me|this} for {dur}
- {alert|ping|buzz} me in {dur}
- {let me know|tell me} when {dur} {are|is} up
- {set|start} a {pasta|tea|egg|glue|baking|break} timer for {dur}
- I need a timer{ for {dur}|}

## Values: dur
- 10 minutes
- 5 min
- an hour
- half an hour
- 1h30
- 90 seconds
- three minutes
- 2 hours
- 45 seconds
- an hour and a half
- 20 mins
- a minute
- twenty five minutes
- 15 minutes
- 7 minutes
- 40 min
- 2 and a half hours
- 30 seconds
- 12 minutes
- a quarter of an hour

## Replies
- ask: How long? For example “10 minutes” or “1h30”. | Sure. For how long?
- done: Timer set for {dur}. It rings at {at}. | {dur}, starting now. Done at {at}.
- ring: ⏰ {dur} timer is done.
- is_time: That's a time rather than a duration, so here's a reminder instead:
