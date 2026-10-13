---
skill: move_item
help: move files and folders (“move ideas.md to documents”)
samples: 10
train_only: item, dest, src
acts: yes
---
# Move a file or a folder

Moves one file or folder into another folder. Places work as for creating: "documents",
"downloads" and the other standard folders map to their real names, anything else is a folder
in your home folder. As in the other file skills, `location` is where the thing ends up; `source`
is the folder it comes from, when one is named. It never overwrites (if the name is taken there, nothing moves), never
creates the destination, and doesn't move things to the bin: deleting stays out. (That is why
the script, not the Slots line, asks where: the bin is refused before any question.)

## Slots
- name: text, required, ask: ask_name
- location: text
- source: text

## Examples
- move [{item}](name) to [{dest}](location)
- {please |}move [{item}](name) {to|into} {the |my |}[{dest}](location){ folder|}
- move {the file |the folder |}[{item}](name) from [{src}](source) to [{dest}](location)
- move [{item}](name) from {the |my |}[{src}](source){ folder|} {to|into} {the |my |}[{dest}](location){ folder|}
- put [{item}](name) {in|into|inside} {the |my |}[{dest}](location){ folder|}
- {can|could} you move [{item}](name) {to|into} [{dest}](location){?|}
- move [{item}](name) over to [{dest}](location)
- [{item}](name) {should go|goes|belongs} in [{dest}](location)
- {relocate|transfer|shift} [{item}](name) to [{dest}](location)
- move {the file|the folder} [{item}](name) {to|into} [{dest}](location)
- {take|get} [{item}](name) out of [{src}](source) and put it in [{dest}](location)
- mv [{item}](name) [{dest}](location)
- move [{item}](name)
- move {a file|a folder|something|this file|a document}
- I want to move [{item}](name)
- move {the |my |}[{item}](name) to {the |my |}[{dest}](location){ folder| please|}
- {transfer|relocate} [{item}](name) {to|into} {the |my |}[{dest}](location)
- [{item}](name) should go in [{dest}](location)

## Values: item
- ideas.md
- notes.txt
- report.pdf
- budget.csv
- holiday photos
- todo.md
- invoice-2026.pdf
- photo.jpg
- plan.md
- scans
- old stuff
- readme.md
- cv.docx
- taxes
- letter.txt
- sketches
- drafts
- mix.wav
- the tax return
- IMG_2041.png
- meeting notes
- backup.zip
- recipes
- pitch deck
- contract_v2.pdf
- journal
- screenshots
- thesis.tex
- garden plans
- the photos
- my cv
- shopping list
- passport scan.pdf
- the old invoices
- flyer.png
- minutes-march.md
- playlist.m3u
- the budget
- vacation videos
- homework
- letter to the bank.odt
- keys.txt
- x.py
- the wedding album
- todo list
- draft
- prototype v3
- DSC_0193.jpg
- the lease
- book notes
- index.html
- the report
- summer camp forms
- config.yaml

## Values: dest
- documents
- Documents
- downloads
- desktop
- pictures
- archive
- projects
- work
- music
- notes
- backup
- school
- inbox
- old stuff
- 2026
- photos
- shared
- admin

## Values: src
- downloads
- desktop
- documents
- inbox
- pictures
- work
- temp
- Downloads

## Replies
- ask_name: What should I move? | Which file or folder?
- ask_where: Where should it go? | Move it to which folder?
- done: Moved {name}{from} to {to}.
- no_bin: I don't move things to the bin: deleting stays out of what I do.
- same: {name} is already there.
