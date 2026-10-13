---
skill: get_weather
help: check the weather (“weather tomorrow”)
train_only: city, day
samples: 8
uses: network            # nothing to answer without it
---
# Weather

Current weather or the forecast for up to 16 days, from Open-Meteo (open-meteo.com: free,
no key). Without a place it uses the place you told the agent you live in. The day comes
from the date parser ("tomorrow", "on friday", "this weekend").

How it works: the request below is everything sent to the weather service. `{place.lat}`
and `{place.lon}` come from the agent's place lookup, which turns a city name into
coordinates. The answer comes from the fields listed under Answer: the current weather, or,
when the sentence names a day, that day's row in the 16-day forecast (`{date}` picks it).
There is no skill.js: this file is the whole skill.

Privacy: the place name and its coordinates are sent to Open-Meteo. Nothing else is.

## Slots
- place: place, required, ask: ask_place, default: home
- day: datetime, within: 15 days, past: past, too_far: too_far

## Request
GET https://api.open-meteo.com/v1/forecast
- latitude: {place.lat}
- longitude: {place.lon}
- current: temperature_2m,weather_code,wind_speed_10m
- daily: weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
- timezone: auto
- forecast_days: 16

## Answer
- temp: current.temperature_2m round
- wind: current.wind_speed_10m round
- sky: current.weather_code → sky
- min: daily.temperature_2m_min[daily.time = {date}] round
- max: daily.temperature_2m_max[daily.time = {date}] round
- rain: daily.precipitation_probability_max[daily.time = {date}]
- sky: daily.weather_code[daily.time = {date}] → sky

## Examples
- what's the weather{ like|}{ today| now|}{?|}
- {how's|what's} the weather {in|at} [{city}](place){ today| now|}{?|}
- what's the weather {like |}{in|at} [{city}](place) {day}{?|}
- {will|is it going to} {rain|snow} {day}{?|}
- {will|is it going to} {rain|snow} in [{city}](place) {day}{?|}
- {do I need|should I take} an umbrella{ {day}|}{?|}
- {how|how's the} weather {day}{?|}
- {weather|forecast}{ please| today| for {day}|}
- {weather|forecast} {for|in} [{city}](place){ {day}|}
- what's the {forecast|weather forecast} {day}{?|}
- what's the {forecast|weather forecast} for [{city}](place){ {day}|}{?|}
- {how|how's it} {hot|cold|warm} {is it |}{outside|out there}{?|}
- {how|how's it} {hot|cold|warm} is it in [{city}](place){?|}
- what's the temperature {outside|out there}{?|}
- what's the temperature in [{city}](place){ {day}|}{?|}
- is it {sunny|raining|snowing|windy|cold|hot} {outside|in [{city}](place)}{?|}
- {is it|will it be} {sunny|nice|warm|cold} {day}{?|}
- {tell me|give me} the weather{ for [{city}](place)|}{ {day}|}
- {can|could} you check the weather{ in [{city}](place)|}{?|}
- {should|can} I {go for a walk|ride my bike|hang the laundry outside} {day}{?|}
- {do I need|should I wear|should I bring|will I need} {a coat|a jacket|an umbrella|sunglasses|gloves|a scarf|sunscreen|boots}{ {day}|}{?|}
- is it going to {rain|snow|be sunny|be cold|be warm|be windy|storm} {day}{?|}
- {any|is there any} {rain|snow|sun|wind} {expected|coming|forecast}{ in [{city}](place)|}{ {day}|}{?|}
- what's it like {outside|out there}{ {day}|}{?|}

## Values: city
- Munich
- Paris
- Tokyo
- Lisbon
- New York
- Berlin
- London
- Shenzhen
- Kyoto
- Lyon
- Barcelona
- Hamburg
- Vienna
- Zurich
- Montreal
- Marseille
- Oslo
- Rome
- the Alps
- Garmisch
- Hong Kong
- Rio de Janeiro
- Buenos Aires
- Cape Town
- San Francisco
- Kuala Lumpur
- New Delhi

## Values: day
- today
- tomorrow
- tonight
- this afternoon
- this weekend
- on friday
- on monday
- next week
- the day after tomorrow
- on saturday
- this evening
- in 3 days
- later
- this morning
- tomorrow morning

## Values: sky
- 0 → clear sky
- 1 → mostly clear
- 2 → partly cloudy
- 3 → overcast
- 45 → fog
- 48 → freezing fog
- 51 → light drizzle
- 53 → drizzle
- 55 → heavy drizzle
- 56 → freezing drizzle
- 57 → heavy freezing drizzle
- 61 → light rain
- 63 → rain
- 65 → heavy rain
- 66 → freezing rain
- 67 → heavy freezing rain
- 71 → light snow
- 73 → snow
- 75 → heavy snow
- 77 → snow grains
- 80 → light showers
- 81 → showers
- 82 → violent showers
- 85 → snow showers
- 86 → heavy snow showers
- 95 → thunderstorm
- 96 → thunderstorm with hail
- 99 → thunderstorm with heavy hail

## Replies
- done: {place} right now: {sky}, {temp}°C, wind {wind} km/h.
- day: {when} in {place}: {sky}, {min} to {max}°C, {rain}% chance of rain.
- days: {place}, {when}:
- line: {when}: {sky}, {min} to {max}°C, {rain}% rain
- ask_place: Which city? Tip: say “I live in …” and I'll remember it for next time.
- not_found: I couldn't find a place called “{place}”.
- too_far: I can only see 16 days ahead.
- past: I only have the forecast, not past weather.
- checking: Checking the weather for {place}…
