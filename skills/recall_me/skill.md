---
skill: recall_me
samples: 10
---
# What do you know about me

Says what the agent remembers about you. Everything it knows is listed here: there is nothing else.

## Examples
- what's my name{?|}
- {do you know|do you remember} my name{?|}
- who am I{?|}
- {what do you call me|what did I tell you my name was}{?|}
- where do I live{?|}
- {do you know|do you remember} where I live{?|}
- {what's|what is} my {location|city|home town|home}{?|}
- what do you {know|remember} about me{?|}
- {tell me|show me} what you {know|remember} about me
- what have you {saved|stored|remembered}{ about me|}{?|}
- {do you remember me|do you know who I am}{?|}
- {which|what} {city|town|place} do I live in{?|}
- {where|in which city} am I {based|living}{?|}
- {which|what} name {do you have for me|do you know me by}{?|}

## Replies
- name: Your name is {name}.
- place: You live in {place}.
- all: Here is everything I know about you: {facts}. It's stored on this phone only.
- nothing: I don't know anything about you yet. Tell me “my name is …” or “I live in …”.
- no_name: I don't know your name yet. Tell me “my name is …”.
- no_place: I don't know where you live yet. Tell me “I live in …”.
