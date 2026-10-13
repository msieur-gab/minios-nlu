---
uses: network            # the webhook is somewhere else
---
# Add to my calendar: handed over to a webhook

ptiLU hands the event over to a webhook of your own: an n8n or Activepieces flow with a
Google Calendar, Outlook or Nextcloud step, which holds the sign-in. The webhook gets
`{"title": …, "start": "2026-10-16T09:00"}` (local time, as an ISO date) and only has to
answer with a success. Its `say`, if it sends one, isn't needed: ptiLU confirms itself.

Privacy: what the event is and when go to your webhook, and from there to your calendar.

## Request
POST {hook}
- body.title: {title}
- body.start: {when}

## Secrets
- hook: Which webhook adds events to your calendar? Paste its address.
