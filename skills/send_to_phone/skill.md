---
skill: send_to_phone
help: send a message to your phone (“send buy milk to my phone”)
samples: 18
acts: yes
uses: network            # nothing to send without it
train_only: msg
---
# Send to my phone

Sends a short message to your phone through ntfy (ntfy.sh: free, no account). Install the
ntfy app on your phone and subscribe to a topic name only you know: the first time, the agent
asks for that name and keeps it on this device. Anyone who knows the name can read the
messages, so pick something hard to guess.

How it works: the request below is everything sent. The message goes in a small JSON body;
the topic comes from the `topic` value, which is a secret: asked once, kept on the device,
never shown in the trace. There is no skill.js.

Privacy: the message and the topic are sent to ntfy.sh. Nothing else is.

## Slots
- text: text, required, ask: ask_text
- topic: secret, required, ask: ask_topic

## Request
POST https://ntfy.sh/
- body.topic: {topic}
- body.title: ptiLU
- body.message: {text}

## Examples
- {send|push|forward} [{msg}](text) to my phone{ please|}
- {send|push} {a message|a note|a reminder} to my phone{:|} [{msg}](text)
- {send|push} {me |}a {message|note|notification} {saying|that says} [{msg}](text)
- {notify|ping|text|message} my phone{:| that| saying| with|} [{msg}](text)
- {notify|tell|remind} me on my phone {that |to |}[{msg}](text)
- {send|push} me a {notification|ping|push|note} {saying|that says|with} [{msg}](text)
- {can|could} you send [{msg}](text) to my phone{?|}
- {put|push} [{msg}](text) on my phone
- {send|push} that to my phone
- {send|push} {a message|a note|something} to my phone
- {notify|ping} my phone{ please|}
- {send|give} me a {notification|push notification|ping}{ on my phone|}
- {message|notify} me on my phone{:|} [{msg}](text)

## Values: msg
- buy milk
- call the plumber
- the parcel is at the neighbour's
- pick up the kids at 5
- check the oven
- bring the drill to the workshop
- meeting moved to Thursday
- I'm on my way
- water the plants
- order more cedar boards
- don't forget the charger
- the door code is in the drawer
- dinner is ready
- the printer is out of paper
- grab bread on the way home
- the bus is late
- sand the second coat tomorrow
- take the chicken out of the freezer
- the dishwasher is done
- clamps are on the bench
- pay the electricity bill
- ask the neighbours about Saturday
- the oil needs another hour to cure
- book the dentist
- return the library books
- the delivery arrives at noon
- turn off the heater in the shed
- feed the cat
- the router needs a restart
- bring the umbrella
- start the slow cooker
- the kiln is cooling down
- charge the drill batteries
- the train is cancelled
- the backup finished
- put the bins out
- photos are uploaded
- lock the back door
- the paint is dry
- call the bank back

## Replies
- ask_text: What should I send to your phone?
- ask_topic: Which ntfy topic should I send to? Subscribe to it in the ntfy app first; I'll keep it on this device.
- checking: Sending it to your phone…
- done: Sent to your phone: “{text}”.
- failed: ntfy refused the message (error {status}).
- unsure: Do you want me to send that to your phone?
