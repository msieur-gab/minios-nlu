---
skill: control_music
help: pause, resume or skip the music (“next track”)
samples: 9
acts: yes
---
# Control the music

Pause, resume, next, previous, stop. The command after each arrow goes to the player. A bare
"stop" stays a no to the agent's own questions: here it needs the music named ("stop the music").

## Slots
- control: list control, required, guess, ask: ask, invalid: unknown

## Examples
- [pause](control){ the music| the song| it| this| the track|}{ please|}
- {can|could} you [pause](control) {the music|it|the song}{?|}
- [resume](control){ the music| playing| the song| it|}{ please|}
- [continue](control) {the music|playing|the song}
- [unpause](control){ the music| it|}
- [next](control) {track|song|one}{ please|}
- {the |}[next](control) one please
- [skip](control){ this| this one| this song| this track| it|}{ please|}
- play the [next](control) {track|song|one}
- {go to|jump to} the [next](control) {track|song}
- [previous](control) {track|song|one}{ please|}
- play the [previous](control) {track|song|one}
- {go |}[back](control) {a|one} {track|song}
- {go to|play} the [last](control) {track|song} again
- [stop](control) the {music|song|playback|player}{ please|}
- [stop](control) playing
- {turn|switch} the {music|song} [off](control){ please|}
- {turn|switch} [off](control) the music
- music [off](control)
- [continue](control)
- [pause](control)
- [resume](control)
- [next](control)
- [previous](control)
- [skip](control)
- [pause](control) that
- [skip](control) that

## Values: control
- pause: hold the music → pause
- resume: continue, unpause, carry on, keep playing → play
- next: skip, forward, nxt → next
- previous: back, prev, last, before → prev
- stop: off, end the music → stop

## Replies
- ask: Pause, resume, next, previous or stop?
- unknown: I can't do “{value}” with the music. I can {choices}.
- done_pause: Paused.
- done_resume: Carrying on.
- done_next: Next track.
- done_previous: Previous track.
- done_stop: Stopped.
