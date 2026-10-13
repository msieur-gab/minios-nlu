---
uses: network            # nothing to answer without it
---
# Weather: the call to Open-Meteo

Everything sent to the weather service is the request below. `{place.lat}` and
`{place.lon}` come from the agent's place lookup, which turns a city name into
coordinates. The fields under Answer are the current weather; skill.js reads the asked-for
day(s) from the daily forecast that comes back with it.

Privacy: the place name and its coordinates are sent to Open-Meteo. Nothing else is.

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
