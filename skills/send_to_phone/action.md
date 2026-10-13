---
uses: network            # nothing to send without it
---
# Send to my phone: the call to ntfy

The message goes in a small JSON body. The topic is a secret: asked once, kept on this
device, never shown in the trace.

Privacy: the message and the topic are sent to ntfy.sh. Nothing else is.

## Request
POST https://ntfy.sh/
- body.topic: {topic}
- body.title: ptiLU
- body.message: {text}

## Secrets
- topic: Which ntfy topic should I send to? Subscribe to it in the ntfy app first; I'll keep it on this device.
