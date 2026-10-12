---
skill: get_time
help: tell the time, here or in another city
train_only: city
samples: 8
---
# What time is it

Local time comes from the device. For a place ("what time is it in Tokyo?") the agent asks
Open-Meteo's place search for that place's time zone, so it needs a connection.

## Examples
- what time is it{ now| right now| at the moment|}{?|}
- what's the time{ now| please|}{?|}
- {tell me|give me} the time{ please|}
- {can|could} you tell me the time{?|}
- {the |}time{ please|?|}
- do you have the time{?|}
- {current|local} time{?|}
- what hour is it{?|}
- how late is it{?|}
- {is it|it's} {already |}{late|early}{?|}
- {check|show me} the {time|clock}
- what time is it in [{city}](place){ right now| now|}{?|}
- what's the time in [{city}](place){?|}
- {tell me|give me} the {time|local time} in [{city}](place)
- {what time|what hour} is it {over |}{in|at} [{city}](place){?|}
- is it {night|morning|late} in [{city}](place){?|}
- time in [{city}](place){?|}

## Values: city
- Tokyo
- New York
- Paris
- London
- Shenzhen
- Lisbon
- Sydney
- Montreal
- Los Angeles
- Berlin
- Kyoto
- São Paulo
- Bangkok
- Nairobi
- Reykjavik
- Mexico City

## Replies
- done: It's {time}. | {time}.
- elsewhere: In {place} it's {time} on {day}. | It's {time} in {place} ({day}).
- not_found: I couldn't find a place called “{place}”.
- offline: I can't look up other places right now. Here it's {time}.
- looking: Looking up {place}…
