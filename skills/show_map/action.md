---
uses: network            # the place search needs it
---
# Show on a map: the place search

One call to Open-Meteo's place search (free, no key), the same one the weather uses. The
reply builds an OpenStreetMap link from the coordinates; opening it is up to you.

Privacy: the place name is sent to Open-Meteo, and to OpenStreetMap if you open the link.

## Request
GET https://geocoding-api.open-meteo.com/v1/search
- name: {place}
- count: 1
- language: en
- format: json

## Answer
- lat: results[0].latitude required
- lon: results[0].longitude
- name: results[0].name
- country: results[0].country
