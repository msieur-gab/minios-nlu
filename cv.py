"""5-fold cross-validation of adding a dataset on top of the template seed.

    python cv.py data/synth_v1.md
"""
import random
import sys
import tempfile

import evaluate
import train
from nlu.dataset import load


def score(rows):
    ok = sum(r[0] for r in rows); n = sum(r[1] for r in rows)
    tp = sum(r[2] for r in rows); fp = sum(r[3] for r in rows); fn = sum(r[4] for r in rows)
    p = tp / (tp + fp) if tp + fp else 0; r = tp / (tp + fn) if tp + fn else 0
    return 100 * ok / n, (2 * p * r / (p + r) if p + r else 0)


def main(new_path, k=5, dup=1):
    base = load("data/train.md")
    new = load(new_path)
    random.Random(1).shuffle(new)
    folds = [new[i::k] for i in range(k)]
    tmp = tempfile.mkdtemp()
    before, after = [], []
    train.fit_export(base, tmp + "/base.json", verify=False)
    for i in range(k):
        test = folds[i]
        tr = base + [e for j, f in enumerate(folds) if j != i for e in f] * dup
        train.fit_export(tr, tmp + "/fold.json", verify=False)
        before.append(evaluate.main(None, tmp + "/base.json", quiet=True, examples=test))
        after.append(evaluate.main(None, tmp + "/fold.json", quiet=True, examples=test))
    b, a = score(before), score(after)
    print("on unseen %s sentences (%d-fold, weight x%d):" % (new_path, k, dup))
    print("  templates only : intent %.1f%%  slot F1 %.2f" % b)
    print("  + new data     : intent %.1f%%  slot F1 %.2f" % a)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/synth_v1.md",
         dup=int(sys.argv[2]) if len(sys.argv) > 2 else 1)
