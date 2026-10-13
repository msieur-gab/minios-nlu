<!-- Fresh held-out set, written 13 October 2026 at 15:50, BEFORE any model was scored on it.
     Not in data/manifest.json: never train on these lines. If a line fails, fix the skill's
     vocabulary with other words, then write new fresh lines; don't edit or copy these. -->

## intent: create_folder
- put a new folder called [field recordings](name) in [music](location)
- I want a directory for [quotes](name)
- make a folder named [shop and garden](name)
- could you set up a dir called [renders](name) under [projects](location)
- folder [old drafts](name) on the [desktop](location) please
- new folder for [receipts 2026](name)
- create a directory, call it [samples](name)

## intent: create_file
- write a new text file called [packing](name)
- make me a [markdown](file_type) file named [chapter one](name)
- start a [csv](file_type) called [expenses](name) in [documents](location)
- new note [questions for the vet](name)
- create an empty file named [setup](name) on the [desktop](location)
- I need a [json](file_type) file called [settings](name)

## intent: open_app
- launch the [calculator](app)
- bring up the [text editor](app)
- I want to browse the web, open [chromium](app)
- start [firefox](app) please
- can you open the [settings](app)
- fire up a [terminal](app)

## intent: open_file
- open the [invoices](name) folder
- show me [notes.txt](name)
- open [report.pdf](name) from [downloads](location)
- let me see what's inside [projects](name)
- open my [shopping list](name)

## intent: adjust_volume
- [raise](direction) the music a bit
- the sound is too quiet, make it [louder](direction)
- please [mute](direction) everything
- put the volume at [20%](level)
- could you turn the music [down](direction)
- it's way too loud in here

## intent: adjust_brightness
- the screen is too dark
- [brighten](direction) the display
- screen brightness to [30 percent](level)
- can you [dim](direction) the screen a bit
- turn the brightness [down](direction) please

## intent: system_status
- how much [memory](metric) is free
- is the [cpu](metric) busy right now
- do I still have [disk space](metric)
- what's the [temperature](metric) of the pi
- give me a quick system check
- how long has the pi been up

## intent: power
- [reboot](power_action) the pi please
- [turn off](power_action) the computer
- can you [restart](power_action) now
- [power down](power_action) everything

## intent: greet
- hey there
- good morning
- hi ptilu

## intent: thanks
- thank you very much
- cheers
- great, thanks

## intent: help
- what can you do for me
- which commands do you understand
- help me please

## intent: affirm
- yes please
- sure
- that's right

## intent: deny
- no thanks
- not now
- nope

## intent: out_of_scope
- who invented you
- time to make dinner
- what's the meaning of life
- play the radio
- call my sister
- how tall is the eiffel tower
- the coffee is cold
- my bike has a flat tyre

## intent: get_time
- what time is it in [Madrid](place)
- tell me the time over in [Melbourne](place)
- what's the hour in [Cairo](place)
- do you know the time
- time check please
- is it late in [Hanoi](place) right now

## intent: get_date
- what's today's date
- which day of the week is it
- what day falls on new year's eve
- remind me what the date is
- how many days left until christmas
- is it the weekend yet

## intent: set_timer
- set a 15 minute timer
- countdown 2 minutes please
- timer for half an hour
- start a timer for the tea, 4 minutes
- time 90 seconds

## intent: set_reminder
- remind me to [buy glue](task) tomorrow morning
- in two hours remind me to [check the varnish](task)
- remind me to [call Eva](task) on thursday at 5pm
- set a reminder for [the dentist](task) next monday
- please remind me to [move the car](task) at 8
- I need a reminder to [order cedar](task) on friday

## intent: get_weather
- will it be windy tomorrow
- what's the forecast for [Hamburg](place)
- is it cold outside right now
- weather for [Vienna](place) on sunday
- should I take an umbrella today
- how warm will it get in [Marseille](place) this weekend

## intent: remember_me
- my name is [Lea](name)
- I live in [Leipzig](place) now
- you can call me [Gabriel](name)
- my home is in [Toulouse](place)

## intent: recall_me
- what's my name
- where do I live
- what do you remember about me

## intent: forget_me
- forget where I live
- delete my name
- forget everything about me

## intent: send_to_phone
- send [the parcel arrived](text) to my phone
- ping my phone saying [dinner at eight](text)
- push a note to my phone: [buy screws](text)
- notify my phone that [the kiln is done](text)
- send a notification with [leave in ten minutes](text)

## intent: send_telegram
- send [running late](text) on telegram
- telegram me [the oven is off](text)
- message me on telegram saying [bring the ladder](text)
- send a telegram that says [meeting moved](text)

## intent: show_map
- show me [Lyon](place) on a map
- where is [Bordeaux](place)
- open a map of [Prague](place)
- find [Lisbon](place) on the map
