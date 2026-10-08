"""Generate a template-based seed training set -> data/train.md

Template syntax:
  {a|b|}      pick one alternative (empty allowed)
  <name> etc. slot placeholder, filled from a pool and annotated
"""
import random
import re

random.seed(7)

NAMES = [
    "reports", "ideas", "invoices", "holiday photos", "project-x", "2026_budget",
    "Recipes", "todo", "drafts", "scans", "sketches", "kids drawings", "backup",
    "old stuff", "receipts", "client-work", "music", "notes", "archive", "taxes",
    "WoodShop", "garden plans", "travel", "screenshots", "temp", "prototypes",
    "Japan trip", "letters", "q3-review", "experiments", "assets", "maps", "fonts",
    "homework", "PhotosRaw", "inbox", "misc", "v2", "lab", "journal", "pitch deck",
    "school", "bills", "cedar box", "readings", "tools", "demo", "sandbox", "wip",
    "tax returns", "family photos", "old invoices", "work in progress", "summer camp", "car stuff",
    "client projects", "music lessons", "game saves", "house plans", "my scripts", "trip to lisbon",
    "wedding pics", "spare parts", "recipes from grandma", "q4 planning", "design ideas", "phone backup",
]
FILE_NAMES = [
    "notes", "todo", "readme", "ideas", "shopping list", "journal", "draft",
    "meeting notes", "plan", "index", "config", "main", "budget", "diary",
    "reading list", "brief", "changelog", "Report2026", "scratch", "recipe",
    "packing list", "agenda", "log", "summary", "letter to mom", "tasks",
    "daily journal", "grocery list", "project notes", "release notes", "book ideas", "travel plan",
    "workout log", "gift ideas", "call notes", "monthly report", "bug list", "draft for friday",
]
FILE_WITH_EXT = [
    "notes.md", "todo.txt", "README.md", "main.py", "index.html", "data.json",
    "budget.csv", "config.yml", "style.css", "app.js", "ideas.md", "log.txt",
    "plan-2026.md", "test_run.py", "shopping.txt", "trip.md", "draft_v2.md",
]
TYPES = [
    "markdown", "md", "text", "txt", "plain text", "python", "json", "html",
    "csv", "yaml", "javascript", "css", "Markdown",
]
LOCS = [
    "documents", "Documents", "desktop", "downloads", "projects", "music",
    "pictures", "home", "photos", "work", "school", "notes", "archive",
    "Desktop", "src", "inbox", "my documents", "the projects folder",
]
DEICTIC_IN = ["this folder", "the current folder", "the current directory",
              "this directory", "current dir", "here"]
APPS = [
    "terminal", "console", "shell", "command line", "browser", "web browser",
    "firefox", "chromium", "file manager", "files", "file explorer",
    "text editor", "editor", "calculator", "settings", "Terminal", "Browser",
]

LEVELS = ["50%", "30 percent", "20", "75%", "100%", "10%", "40 percent", "max", "maximum",
          "half", "zero", "minimum", "full", "60", "85%", "25 percent", "5%"]
METRICS = ["disk space", "disk", "storage", "space left", "cpu", "cpu usage", "processor",
           "temperature", "temp", "cpu temperature", "memory", "ram", "memory usage",
           "network", "wifi", "ip address", "ip", "uptime", "performance", "load", "free space"]
POWER = ["shut down", "shutdown", "power off", "turn off", "reboot", "restart", "sleep", "suspend"]

ALT = re.compile(r"\{([^{}]*)\}")


def expand(t):
    while True:
        m = ALT.search(t)
        if not m:
            return t
        t = t[:m.start()] + random.choice(m.group(1).split("|")) + t[m.end():]


def article(word):
    return "an" if word.lower()[0] in "aeiou" or word.lower() in ("md", "html") else "a"


def loc_span():
    loc = random.choice(LOCS)
    if loc.startswith("the ") and loc.endswith(" folder"):
        return "the [" + loc[4:-7] + "](location) folder"
    if loc.startswith("my "):
        return "my [" + loc[3:] + "](location)"
    return "[" + loc + "](location)"


def fill(t):
    t = expand(t)
    t = t.replace("<name>", lambda_name())
    while "<fname>" in t:
        t = t.replace("<fname>", "[" + random.choice(FILE_NAMES) + "](name)", 1)
    while "<fext>" in t:
        t = t.replace("<fext>", "[" + random.choice(FILE_WITH_EXT) + "](name)", 1)
    while "<atype>" in t:
        ty = random.choice(TYPES)
        t = t.replace("<atype>", article(ty) + " [" + ty + "](file_type)", 1)
    while "<type>" in t:
        t = t.replace("<type>", "[" + random.choice(TYPES) + "](file_type)", 1)
    while "<loc>" in t:
        t = t.replace("<loc>", loc_span(), 1)
    while "<here>" in t:
        d = random.choice(DEICTIC_IN[:-1])
        if d.startswith("the "):
            t = t.replace("<here>", "the [" + d[4:] + "](location)", 1)
        else:
            t = t.replace("<here>", "[" + d + "](location)", 1)
    while "<level>" in t:
        t = t.replace("<level>", "[" + random.choice(LEVELS) + "](level)", 1)
    while "<metric>" in t:
        t = t.replace("<metric>", "[" + random.choice(METRICS) + "](metric)", 1)
    while "<power>" in t:
        t = t.replace("<power>", "[" + random.choice(POWER) + "](power_action)", 1)
    while "<target>" in t:
        r = random.random()
        if r < 0.45:
            t = t.replace("<target>", "[" + random.choice(FILE_WITH_EXT) + "](name)", 1)
        elif r < 0.75:
            t = t.replace("<target>", "the [" + random.choice(FILE_NAMES) + "](name) file", 1)
        else:
            t = t.replace("<target>", "the [" + random.choice(NAMES) + "](name) folder", 1)
    while "<app>" in t:
        t = t.replace("<app>", "[" + random.choice(APPS) + "](app)", 1)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def lambda_name():
    n = random.choice(NAMES)
    r = random.random()
    if r < 0.15:
        return '"[' + n + '](name)"'
    if r < 0.22:
        return "'[" + n + "](name)'"
    return "[" + n + "](name)"


T = {
    "create_folder": [
        "{please |}{create|make|add|set up|build} {a |a new |}{folder|directory|dir} {called|named} <name>",
        "{please |}{create|make|add} {a |a new |}{folder|directory} {called|named} <name> {in|inside|under|within} <loc>",
        "{create|make} {a |a new |}{folder|directory} {called|named|} <name> here",
        "{create|make} {a |a new |}{folder|directory} {called|named} <name> {in|inside} <here>",
        "{create|make|add} {a |a new |}{folder|directory} {in|inside} <loc> {called|named} <name>",
        "{create|make} {a |a new |}{folder|directory} here {called|named} <name>",
        "new folder <name>{ please|}",
        "new {folder|directory} {in|inside} <loc> {called|named} <name>",
        "{can|could} you {create|make} {a |a new |}folder {called|named} <name>{ for me|}{?|}",
        "{can|could} you {create|make} {a |a new |}folder {in|inside} <loc>{?|}",
        "I {need|want} {a |a new |}{folder|directory} {called|named|for} <name>{ in <loc>|}",
        "{create|make} {a |a new |}{folder|directory}{ please|}",
        "{create|make} {a |a new |}{folder|directory} {in|inside} <loc>",
        "{create|make} {a |a new |}{folder|directory} here",
        "{make|create} <name> {folder|directory}{ in <loc>|}",
        "{add|create} {a |}subfolder {called|named} <name> {in|inside|to} <loc>",
        "mkdir <name>",
        "{please |}{put|add} {a |a new |}folder {called|named} <name> {on|in} <loc>",
        "{let's|lets} {create|make} {a |}{folder|directory} {called|named} <name>",
        "{create|make} {a |a new |}{folder|directory} {called|named} <name> {on the|in my|in the} <loc>",
    ],
    "create_file": [
        "{please |}{create|make|add|start} {a |a new |}file {called|named} <fname>",
        "{please |}{create|make|add|start|write} {a |}{new |}<type> file {called|named} <fname>",
        "{please |}{create|make|add|start|write} <atype> file {called|named} <fname>{ in <loc>|}",
        "{create|make|add} {a |a new |}<type> file {called|named} <fname> {in|inside} <loc>",
        "{create|make|add} {a |a new |}file {called|named} <fname> {in|inside} <loc>",
        "{create|make|add} {a |a new |}file {called|named} <fname> here",
        "{create|make|add} {a |a new |}<type> file {called|named} <fname> {in|inside} <here>",
        "{create|make|add|touch} <fext>{ please|}",
        "{create|make|add} {a |a new |}file <fext>{ in <loc>|}",
        "{create|make|add} <fext> {in|inside} <loc>",
        "{create|make} <fext> here",
        "new <type> file <fname>",
        "new file <fext>",
        "new <type> {note|document|doc} {called|named} <fname>",
        "{make|create|start} {me |}{a |a new |}<type> {note|document|doc} {called|named} <fname>",
        "{can|could} you {create|make} {a |a new |}<type> file{ for me|}{?|}",
        "{can|could} you {create|make} {a |a new |}file {called|named} <fname>{?|}",
        "I {need|want} {a |a new |}<type> file {called|named} <fname>",
        "I {need|want} {a |a new |}file {called|named} <fext>",
        "{create|make} {a |a new |}file{ please|}",
        "{create|make} {a |a new |}<type> file{ please|}",
        "{create|make} {a |a new |}<type> file {in|inside} <loc>",
        "{create|make} {a |a new |}file here",
        "{create|make} {a |a new |}file {in|inside} <loc> {called|named} <fname>",
        "{write|start} {a |}new {note|document} {called|named} <fname>",
        "touch <fext>",
        "{create|make|add|put} <fext> {on the|in the|in my|on my} <loc>",
        "{create|make|add} {a |a new |}<type> file {called|named} <fname> {on the|in my} <loc>",
        "{let's|lets} {create|make} {a |}<type> file {called|named} <fname>",
    ],
    "open_file": [
        "{open|show|show me|display|view|pull up|bring up} <target>",
        "{open|show me|display} <target> {in|from|inside} <loc>",
        "{can|could} you open <target>{ for me|}{?|}",
        "I {want|need} to {see|read|look at|edit} <target>",
        "{please |}open <target>{ please|}",
        "{open|show} {up |}{my |}<target>",
        "{let's|lets} {look at|open} <target>",
        "{open|show me} what's in <target>",
        "{go to|take me to|jump to} the <loc> folder",
        "{open|show me} {the |my |}<loc> folder",
        "{open|edit} <target> {on the|in my} <loc>",
        "open a file{ please|}",
        "{open|show me} {a|the} file",
    ],
    "adjust_volume": [
        "{turn|crank|bump|put} {the |}{volume|sound|music} [up](direction){ please| a bit| a little|}",
        "{turn|put} {the |}{volume|sound|music} [down](direction){ please| a bit| a little|}",
        "{turn|crank|bump} it [up](direction)",
        "turn it [down](direction){ a bit|}",
        "[increase](direction) {the |}volume{ please| a bit|}",
        "[decrease](direction) {the |}volume{ please| a bit|}",
        "[raise](direction) the {volume|sound}",
        "[lower](direction) the {volume|sound}{ please|}",
        "make it [louder](direction){ please|}",
        "make it [quieter](direction){ please|}",
        "{a bit |}[louder](direction){ please|}",
        "{a bit |}[quieter](direction){ please|}",
        "{too loud|it's too loud|way too loud}",
        "{I can't hear anything|I can barely hear it|can't hear}",
        "{set|put|change} {the |}volume to <level>",
        "volume {at|to} <level>{ please|}",
        "volume <level>",
        "{turn|set} the {volume|sound} [up](direction) to <level>",
        "{turn|set} the {volume|sound} [down](direction) to <level>",
        "[mute](direction){ the sound| the volume| it| everything|}{ please|}",
        "[unmute](direction){ the sound| the volume| it|}{ please|}",
        "{silence|quiet} please",
        "volume [up](direction)",
        "volume [down](direction)",
        "{change|adjust} the volume",
    ],
    "adjust_brightness": [
        "{turn|put} {the |}{brightness|screen brightness} [up](direction){ please| a bit|}",
        "{turn|put} {the |}{brightness|screen brightness} [down](direction){ please| a bit|}",
        "[increase](direction) {the |}{brightness|screen brightness}",
        "[decrease](direction) {the |}{brightness|screen brightness}",
        "[raise](direction) the brightness",
        "[lower](direction) the brightness{ please|}",
        "make the {screen|display} [brighter](direction){ please|}",
        "make the {screen|display} [darker](direction){ please|}",
        "[dim](direction) the {screen|display}{ please| a bit|}",
        "[brighten](direction) the {screen|display}",
        "{the |}screen is too {dark|bright}",
        "{I can't see the screen|it's too bright|it's too dark}",
        "{set|put|change} {the |}brightness to <level>",
        "brightness {at|to} <level>{ please|}",
        "brightness <level>",
        "screen brightness <level>",
        "brightness [up](direction)",
        "brightness [down](direction)",
        "{change|adjust} the {brightness|screen brightness}",
        "{a bit |}[brighter](direction){ please|}",
        "{a bit |}[dimmer](direction){ please|}",
    ],
    "system_status": [
        "how much <metric> {is left|do I have|is there|is free|is available}{?|}",
        "{show|show me|check|what's|what is|tell me} {the |my |}<metric>{?|}",
        "{check|show me|what's} {the |}<metric> {usage|status|level}",
        "how{'s| is} the <metric>{ doing|}{?|}",
        "is the <metric> {ok|okay|fine|too high|full|hot}{?|}",
        "{am I|are we} running out of <metric>{?|}",
        "{system|device} {status|info|health}{ please|}",
        "how{'s| is} the {system|device|computer|board|pi} doing{?|}",
        "{is the pi|is it|is the board} {overheating|too hot|getting hot}{?|}",
        "how hot is the {cpu|pi|board|processor}{?|}",
        "{give me|show me} a {system|status|health} {report|overview|check}",
        "what's my <metric>{?|}",
        "<metric>{?| please| status|}",
        "{check|run a} {system|health} check",
        "{is|are} {there|we} enough <metric>{?|}",
    ],
    "power": [
        "{please |}<power> {the |}{computer|pi|device|system|board|machine}{ now| please|}",
        "<power>{ now| please|}",
        "{can|could} you <power> {the |}{computer|system|device}{?|}",
        "I want to <power>{ the device| the computer|}",
        "{time to|let's|lets} <power>",
        "{go to|put it to} [sleep](power_action){ now|}",
        "{please |}<power> everything",
        "{turn the computer off|switch off the device}",
        "{power|shut} it down",
    ],
    "open_app": [
        "{open|launch|start|run} {the |my |}<app>",
        "{please |}{open|launch|start} {the |}<app>{ please|}",
        "{can|could|would} you {open|launch|start} {the |a |}<app>{ please|}{?|}",
        "{bring up|fire up|pull up|show} {the |my |}<app>",
        "I {need|want} {the |a |}<app>",
        "I {want|need} to use the <app>",
        "<app>{ please|}",
        "{open|launch} {a |}new <app> window",
        "{give me|get me} {a |the |}<app>",
        "{open|start} {up |}{the |}<app> {app|application|program}",
        "{open|launch|start} {an app|an application|a program|something}{ please|}",
        "{let's|lets} open the <app>",
        "{switch to|go to} the <app>",
    ],
}

SMALL = {
    "greet": ["hi", "hello", "hey", "hey there", "good morning", "good evening",
              "hello agent", "hi there", "yo", "morning", "hiya", "greetings",
              "hello computer", "hey buddy", "good afternoon", "howdy"],
    "thanks": ["thanks", "thank you", "cheers", "thanks a lot", "great thanks",
               "perfect thank you", "thx", "nice one", "awesome thanks", "much appreciated",
               "thank you so much", "ty", "great, thanks", "cool thanks", "brilliant thank you"],
    "help": ["help", "what can you do", "what are your commands", "how does this work",
             "show me what you can do", "options", "I'm lost", "what do you know",
             "help me", "list your commands", "what can I ask you", "how do I use you",
             "what are you able to do", "any tips", "commands", "what can I say"],
    "affirm": ["yes", "yeah", "yep", "sure", "ok", "okay", "do it", "go ahead",
               "correct", "absolutely", "sounds good", "please do", "yes please",
               "that's right", "right", "affirmative", "of course", "go for it", "y"],
    "deny": ["no", "nope", "cancel", "never mind", "nevermind", "stop", "forget it",
             "don't", "no thanks", "abort", "no way", "not now", "cancel that",
             "leave it", "n", "scratch that", "actually no", "drop it"],
    "out_of_scope": [
        "what's the weather like", "tell me a joke", "what time is it", "play some music",
        "how much is 12 times 7", "send an email to my boss", "delete the reports folder", "remove notes.md", "rename the folder to drafts",
        "move invoices to the archive", "delete everything", "what is the capital of france",
        "who are you", "set an alarm for 7", "turn off the wifi", "how are you", "order a pizza", "copy the file to desktop",
        "show me the news", "translate hello into japanese", "book a flight to tokyo",
        "what's 2 plus 2", "install firefox", "update the system", "take a screenshot", "lock the screen", "connect to bluetooth", "where am I",
        "list the files", "what's in this folder", "go to documents", "change directory to projects",
        "close the browser", "kill the terminal", "uninstall python", "zip the photos folder",
        "search for invoices", "find my notes", "read me the file", "print the document",
        "the sky is blue",
        "banana", "asdfgh", "i like trains", "my cat is sleeping", "can you sing",
        "what is love", "write me a poem", "sudo rm -rf", "format the drive",
        "make me a sandwich", "create an account on github", "open my bank account",
        "call mom", "send a text to Paul", "remind me tomorrow", "how old are you",
        "the folder is too big", "I hate this file", "files are boring",
        "what is a markdown file", "how do folders work", "explain the terminal",
        "is the browser safe", "which editor is the best", "I created a folder yesterday",
        "my terminal crashed", "the file is empty", "share this folder with Eva",
        "empty the trash", "restore the backup", "download the report",
        "turn off the bluetooth", "turn off notifications", "close the file",
        "how loud is a jet engine", "what is cpu", "buy more ram",
        "my screen is broken", "clean the screen", "what does reboot mean", "never shut down",
        "who turned off the lights", "the volume of a sphere", "the music was great yesterday",
        "how to free up disk space on windows", "open the window it's hot", "open the door",
        "show me a picture of a cat", "what's the temperature in Paris", "is it hot outside",
        "set the timer to 10 minutes", "play the next song", "skip this track",
        "check my email", "open my bank app", "open google.com", "what's the battery level",
    ],
}

PER_TEMPLATE = {"create_folder": 14, "create_file": 12, "open_app": 16, "open_file": 22,
                "adjust_volume": 9, "adjust_brightness": 10, "system_status": 18, "power": 20}


def main():
    out = []
    for intent, temps in T.items():
        seen = set()
        for t in temps:
            for _ in range(PER_TEMPLATE[intent]):
                s = fill(t)
                if s not in seen:
                    seen.add(s)
        out.append((intent, sorted(seen)))
    for intent, lines in SMALL.items():
        out.append((intent, lines))
    with open("data/train.md", "w", encoding="utf-8") as fh:
        fh.write("<!-- generated by seed_data.py -->\n")
        for intent, lines in out:
            fh.write("\n## intent: %s\n" % intent)
            for l in lines:
                fh.write("- %s\n" % l)
    for intent, lines in out:
        print(intent, len(lines))


if __name__ == "__main__":
    main()
