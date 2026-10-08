"""Lint dataset files: duplicates, cross-intent conflicts, structure diversity.

    python lint.py data/raw/batch_B_raw.md [more files...]
"""
import collections
import re
import sys

from nlu.dataset import load
from train import TRAIN_FILES

norm = lambda t: " ".join(re.sub(r"[?!.,]", "", t.lower()).split())


def frame(e):
    t = e["text"]
    for s, x, n in sorted(e["spans"], key=lambda z: -z[0]):
        t = t[:s] + "<" + n + ">" + t[x:]
    return norm(t)


def main(paths):
    existing = collections.defaultdict(set)
    for p in TRAIN_FILES:
        for e in load(p):
            existing[norm(e["text"])].add(e["intent"])
    new = [(p, e) for p in paths for e in load(p)]
    labels = collections.defaultdict(set)
    for p, e in new:
        labels[norm(e["text"])].add(e["intent"])
    by = collections.defaultdict(list)
    for p, e in new:
        by[e["intent"]].append(e)
    print("%-18s %5s %6s %7s" % ("intent", "lines", "unique", "frames"))
    for it, ex in by.items():
        print("%-18s %5d %6d %7d" % (it, len(ex), len({norm(e['text']) for e in ex}), len({frame(e) for e in ex})))
    print("\nconflicts inside new files:")
    for t, ls in labels.items():
        if len(ls) > 1:
            print("  %-40s %s" % (t, sorted(ls)))
    print("\nconflicts with existing training data:")
    for t, ls in labels.items():
        if t in existing and not ls <= existing[t]:
            print("  %-40s new=%s existing=%s" % (t, sorted(ls), sorted(existing[t])))


if __name__ == "__main__":
    main(sys.argv[1:])
