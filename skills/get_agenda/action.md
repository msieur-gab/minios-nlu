---
uses: network            # the webhook is somewhere else
---
# What's on my calendar: handed over to a webhook

ptiLU asks a webhook of your own and says the sentence that comes back. The webhook gets
`{"when": …}`: a day (`2026-10-16`), a range (`2026-10-17/2026-10-18`), or empty for today.
It answers `{"say": "Two things tomorrow: dentist at 9, call with the bank at 14:00"}`.
An n8n or Activepieces flow can read Google, Outlook or Nextcloud; the reference server in
tools/webhook.js reads a calendar's private iCal address.

Privacy: the day asked goes to your webhook; your events come back from it.

## Request
POST {hook}
- body.when: {day}

## Answer
- say: say required

## Secrets
- hook: Reading your calendar needs a webhook of your own (tools/webhook.js reads an iCal address). Paste its address, or say cancel.
