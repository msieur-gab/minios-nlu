---
skill: add_event
help: add an event to your calendar (“add dentist on friday at 9”)
samples: 16
acts: yes
train_only: what, day
---
# Add to my calendar

Adds an event to your calendar: what and when. The calendar itself is behind a webhook of
your own (see action.md), because Google, Outlook or Nextcloud need a sign-in ptiLU doesn't
hold.

## Slots
- title: text, required, ask: ask_title
- when: datetime, required, ask: ask_when, invalid: ask_when

## Examples
- {add|put|schedule|book} [{what}](title) {on|in|to} my calendar {day}
- {add|put} [{what}](title) {on|in|to} my {calendar|agenda}
- {book|schedule} [{what}](title) {day}{ please|}
- {add|put|schedule|book} [{what}](title) {day}
- {add|create|make} {an event|an appointment|a meeting} {called|named|for} [{what}](title) {day}
- {schedule|set up|plan} {a |}[{what}](title) {day}
- {can|could} you {add|put} [{what}](title) {in|on|to} my {calendar|agenda} {day}{?|}
- {put|add} it {in|on|to} my calendar{ {day}|}
- {add|create} {an event|an appointment|something} {to|in|on} my {calendar|agenda}
- {block|reserve} {time|an hour|the afternoon} for [{what}](title) {day}
- {I have|there's} [{what}](title) {day}{, add it| put it in my calendar|}
- {new|add an} {event|appointment|meeting}{ please|}

## Values: what
- dentist
- a call with the bank
- lunch with Marc
- yoga
- the school meeting
- a haircut
- the car inspection
- dinner at my sister's
- a workshop with the team
- the plumber
- parents' evening
- a review with the client
- the tax advisor
- swimming lessons
- a walk with Lea
- osteopath
- the optician
- a call with the supplier
- Noah's school play
- the insurance appointment
- coffee with Tom
- the electrician
- piano lesson
- a demo for the client
- the parents' meeting
- dinner with friends
- the notary
- a video call with Romain
- football practice
- the furniture delivery
- a site visit

## Values: day
- on friday at 9
- tomorrow at 3pm
- next monday at 10
- on the 24th at 18:00
- today at 5
- on thursday at noon
- tomorrow morning at 8
- next week on tuesday at 14:30
- on saturday at 11am
- the day after tomorrow at 4pm

## Replies
- ask_title: What should I add?
- ask_when: When? For example “friday at 9”.
- checking: Adding “{title}”, {when}…
- done: Added “{title}”, {when}.
- failed: The calendar answered with an error ({status}); nothing was added.
- unsure: Do you want me to add that to your calendar?
