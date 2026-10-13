---
skill: get_route
help: plan a route (“how long from Munich to Salzburg by bike”)
samples: 12
train_only: city
---
# Route

How long it takes to get from one place to another, by car, by bike or on foot. Without a
starting place it starts from where you live.

This file is what people say and what the agent answers. The route itself is worked out by a
webhook of your own (see action.md): ptiLU sends the two places and the way of travelling,
and says the sentence the webhook sends back.

## Slots
- to: place, required, ask: ask_to
- from: place, required, ask: ask_from, default: home
- mode: list mode, guess

## Examples
- {how long|how far} {is it |does it take |}from [{city}](from) to [{city}](to){?|}
- {how long|how far} {is it |does it take |}to [{city}](to){?|}
- {how long|how far} {is it |does it take |}{to go |to get |}{from [{city}](from) |}to [{city}](to) {by|on} [{mode}](mode){?|}
- {route|directions|itinerary} {from [{city}](from) |}to [{city}](to){ please|}
- {route|directions|itinerary} {from [{city}](from) |}to [{city}](to) {by|on} [{mode}](mode)
- {give me|show me|plan|find} {a |the |}{route|directions|way|itinerary} {from [{city}](from) |}to [{city}](to){ by [{mode}](mode)|}
- {how do I get|how can I get|what's the best way} to [{city}](to){ from [{city}](from)|}{?|}
- {can I|could I} [{mode}](mode) {from [{city}](from) |}to [{city}](to){?|}
- {I want to|I need to} {go|get} to [{city}](to){ by [{mode}](mode)|}
- {plan|give me|find} a {route|trip|way}{ please|}
- {how far|how long} is it{ by [{mode}](mode)|}{?|}
- {directions|route|itinerary}{ please|}

## Values: city
- Salzburg
- Innsbruck
- Garmisch
- Lyon
- Bordeaux
- the airport
- Munich
- Augsburg
- Nuremberg
- Lake Starnberg
- Paris
- Vienna
- Zurich
- Prague
- Freising
- Rosenheim

## Values: mode
- car: drive, driving, by car, the car → car
- bike: bicycle, cycle, cycling, ride, riding → bike
- foot: walk, walking, on foot, hike, hiking → foot

## Replies
- ask_to: Where to?
- ask_from: From where? Tip: say “I live in …” and I'll start from there next time.
- checking: Working out the route to {to}…
- done: {say}
- not_found: I couldn't find a route to {to}.
- failed: The route service answered with an error ({status}).
