---
skill: get_agenda
help: tell what's in your calendar (“what's on tomorrow”)
samples: 10
train_only: day
---
# What's on my calendar

Reads what's in your calendar for a day or a range of days. The calendar is behind a webhook of
your own (see action.md); it sends back one sentence, which the agent says.

## Slots
- day: datetime

## Examples
- what's {on|in} my {calendar|agenda|schedule}{ {day}|}{?|}
- what {do I have|have I got|is planned|is on} {day}{?|}
- {do I have|have I got} {anything|something|any meetings|any appointments} {day}{?|}
- {show|read|tell} me my {calendar|agenda|schedule}{ {day}|}
- {am I|will I be} {free|busy} {day}{?|}
- {what's|what is} {next|coming up} {in my calendar|on my agenda|today}{?|}
- {check|look at} my {calendar|agenda}{ {day}|}{ please|}
- {any|my} {meetings|appointments|events} {day}{?|}
- {what does|how does} {day} look{ like|}{?|}
- my {calendar|agenda|schedule}{ please|}

## Values: day
- today
- tomorrow
- this afternoon
- on friday
- next monday
- this week
- this weekend
- next week
- tonight
- on the 24th
- the day after tomorrow
- this morning

## Replies
- checking: Looking at your calendar…
- done: {say}
- not_found: Nothing came back from your calendar.
- failed: The calendar answered with an error ({status}).
