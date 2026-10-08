"""Clean externally generated batches into training files. Every rule is listed here.

    python clean_batches.py
"""
import re

from nlu.dataset import load

norm = lambda t: " ".join(re.sub(r"[?!.,]", "", t.lower()).split())

# Same sentence labeled both volume and brightness: the brief says "it" with no object means volume.
IT_AMBIGUOUS = {"make it up", "maybe set it to 10%", "raise it a little", "lower it down", "increase it some more",
                "decrease it please", "should we go down a bit", "bring it down", "set it up",
                "could you just decrease it", "max it out", "down to ten", "up it"}

# Ambiguous or wrong for this device: removed rather than guessed.
DROP = {
    "adjust_volume": {"i love this song", "this is a library", "mute the tv"},
    "adjust_brightness": {"i love this theme", "this is an oled", "light up the room", "turn the light off",
                          "crank the light up", "lower the light", "light up", "turn that flash off", "dim the tv",
                          "we need more screen", "we need less display", "increase the pc"},
    "system_status": {"we need to upgrade"},
    "power": {"see you later", "bye bye", "pff", "dwn", "it's time to stop"},
    "deny": {"halt"},  # "halt" is a power command
}
FOLDER_BEFORE_NAME = re.compile(r"\b(folder|foler|fldr|dir|directory)\s+((named|called)\s+)?[\"']?$", re.I)
FILLER_START = "slow down"  # batch C out_of_scope: from here on it is quota padding, per the generator's own lines


def to_line(e, drop_file_type=False):
    t, spans = e["text"], e["spans"]
    if drop_file_type and any(n == "name" and re.search(r"\.[A-Za-z0-9]{1,5}$", t[s:x]) for s, x, n in spans):
        spans = [sp for sp in spans if sp[2] != "file_type"]
    for s, x, n in sorted(spans, key=lambda z: -z[0]):
        t = t[:s] + "[" + t[s:x] + "](" + n + ")" + t[x:]
    return "- " + t


def clean(src, dst, note):
    ex = load(src)
    out, seen, log = {}, set(), []
    filler = False
    for e in ex:
        it, k = e["intent"], norm(e["text"])
        if it == "out_of_scope" and k == FILLER_START:
            filler = True
        if filler and it == "out_of_scope":
            log.append(("filler", e["text"])); continue
        if (it, k) in seen:
            log.append(("duplicate", e["text"])); continue
        seen.add((it, k))
        if it == "adjust_brightness" and k in IT_AMBIGUOUS:
            log.append(("volume/brightness conflict", e["text"])); continue
        if k in DROP.get(it, set()):
            log.append(("ambiguous", e["text"])); continue
        if it == "create_file" and any(n == "name" and FOLDER_BEFORE_NAME.search(e["text"][:s])
                                       for s, x, n in e["spans"]):
            log.append(("says folder, labeled file", e["text"])); continue
        if it == "create_folder" and any(e["text"][s:x].lower() == "new folder" for s, x, n in e["spans"]):
            e = {**e, "spans": [sp for sp in e["spans"] if e["text"][sp[0]:sp[1]].lower() != "new folder"]}
            log.append(("fixed: 'new folder' is not a name", e["text"]))
        out.setdefault(it, []).append(to_line(e))
    with open(dst, "w") as fh:
        fh.write("<!-- %s -->\n" % note)
        for it, lines in out.items():
            fh.write("\n## intent: %s\n%s\n" % (it, "\n".join(lines)))
    kept = sum(len(v) for v in out.values())
    print("%s: kept %d of %d" % (dst, kept, len(ex)))
    return log


if __name__ == "__main__":
    log = []
    log += clean("data/raw/batch_A1_raw.md", "data/synth_batch_A1.md", "batch A1 (external generator, 2026-10-08), cleaned by clean_batches.py")
    log += clean("data/raw/batch_B_raw.md", "data/synth_batch_B.md", "batch B (external generator, 2026-10-08), cleaned by clean_batches.py")
    log += clean("data/raw/batch_C_raw.md", "data/synth_batch_C.md", "batch C (external generator, 2026-10-08), cleaned by clean_batches.py")
    counts = {}
    for kind, _ in log:
        counts[kind] = counts.get(kind, 0) + 1
    print(counts)
    with open("data/raw/cleaning_log.txt", "w") as fh:
        fh.write("\n".join("%-28s %s" % x for x in log))
