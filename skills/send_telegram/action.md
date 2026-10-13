---
uses: network            # nothing to send without it
---
# Send a Telegram message: the call to the Bot API

One call to Telegram's Bot API. The token goes in the address, the chat id and the text in a
small JSON body. Both the token and the chat id are secrets: asked once, kept on this
device, never shown in the trace.

Privacy: the message and your chat id are sent to Telegram, with your bot's token.

## Request
POST https://api.telegram.org/bot{token}/sendMessage
- body.chat_id: {chat}
- body.text: {text}

## Secrets
- token: Paste the token @BotFather gave you for your bot.
- chat: What's your chat id? Write to your bot, then open api.telegram.org/bot<token>/getUpdates: it's the number after "chat":{"id":
