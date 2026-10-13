---
uses: network            # the webhook is somewhere else
---
# Route: handed over to a webhook

ptiLU doesn't plan routes: it hands the places over to a webhook of your own and says what
comes back. The webhook gets `{"from": …, "to": …, "mode": …}` and answers
`{"say": "38 min by car, 24 km"}`. It can be an n8n or Node-RED flow, or the small
reference server in tools/webhook.js (places from Open-Meteo, routes from OpenStreetMap's
routing servers).

Privacy: the two places and the way of travelling go to your webhook, and from there to
whatever it uses.

## Request
POST {hook}
- body.from: {from}
- body.to: {to}
- body.mode: {mode}

## Answer
- say: say required

## Secrets
- hook: Routes need a webhook of your own (tools/webhook.js runs one). Paste its address, or say cancel.
