---
skill: play_music
help: play music (“play some music”)
samples: 9
train_only: track
acts: yes
---
# Play music

Starts the music, or what was asked for by name: a track, an album or an artist. The name is
looked up in the device's music folder; nothing is streamed from anywhere else. Without a
name it plays what is there, or carries on where it was paused.

## Slots
- query: text

## Examples
- play {some |}music{ please|}
- {play|put on|start} {some |the |}{music|tunes|songs}
- {put some music on|music please|start the music|let's hear some music|play something}
- I {want|would like} to {hear|listen to} {some |}music
- {can|could} you {play|put on} {some |}music{?|}
- play [{track}](query){ please|}
- play the {song|track|album} [{track}](query)
- play {something|some music|a song|songs|anything} {by|from} [{track}](query)
- put on [{track}](query){ please|}
- {I want to|I'd like to|let me} {hear|listen to} [{track}](query)
- {can|could} you play [{track}](query){?|}
- play me [{track}](query)
- listen to [{track}](query)
- play my [{track}](query)

## Values: track
- nightcall
- Kavinsky
- pink floyd
- wish you were here
- blue in green
- Miles Davis
- bohemian rhapsody
- the beatles
- abbey road
- daft punk
- around the world
- Nina Simone
- feeling good
- radiohead
- karma police
- bob marley
- redemption song
- a love supreme
- John Coltrane
- bad guy
- the rip tide
- beirut
- black focus
- clair de lune
- debussy
- back in black
- real food
- got the tendo
- 1979
- 99 luftballons
- jazz
- the road trip mix
- favourite playlist
- outrun
- Blizzard
- so what
- ole
- curtis mayfield
- move on up
- the cinematic orchestra
- to build a home
- gogo penguin
- hopopono
- something in the way
- la vie en rose
- piano
- workout mix
- that song about the rain

## Replies
- any: Playing music. | Here's some music.
- track: Playing {query}.
